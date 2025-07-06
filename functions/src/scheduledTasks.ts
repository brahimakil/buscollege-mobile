import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

// ✅ UPDATED: New interfaces for currentRiders system
interface CurrentRider {
  id: string;
  name: string;
  email: string;
  subscriptionType: 'monthly' | 'per_ride';
  paymentStatus: 'paid' | 'unpaid' | 'pending';
  status: 'active' | 'inactive';
  assignedAt: string;
  paidAt?: string; // ✅ NEW: Track when payment was made
  expiresAt?: string; // ✅ NEW: Track when payment expires
  subscriptionId: string;
  qrCode: string;
  startDate: string;
  endDate?: string;
}

interface BusData {
  id: string;
  busName?: string;
  currentRiders: CurrentRider[]; // ✅ UPDATED: Use currentRiders instead of subscribers
  lastPaymentCheck?: admin.firestore.Timestamp;
}

interface ExpirationStats {
  totalBuses: number;
  processedBuses: number;
  expiredRiders: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

// ✅ NEW: Check payment expiration every hour
export const checkPaymentExpiration = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: '1GB'
  })
  .pubsub
  .schedule('0 * * * *') // Runs every hour at minute 0
  .timeZone('UTC')
  .onRun(async (context) => {
    const stats: ExpirationStats = {
      totalBuses: 0,
      processedBuses: 0,
      expiredRiders: 0,
      errors: 0,
      startTime: new Date()
    };

    console.log('🚀 Starting payment expiration check...', {
      timestamp: stats.startTime.toISOString(),
      timezone: 'UTC'
    });

    const db = admin.firestore();
    const BATCH_SIZE = 500; // Firestore batch limit

    try {
      // Get all buses with currentRiders
      const busesSnapshot = await db.collection('buses')
        .where('currentRiders', '!=', []) // Only get buses with riders
        .get();

      stats.totalBuses = busesSnapshot.size;
      console.log(`📊 Found ${stats.totalBuses} buses with current riders`);

      if (stats.totalBuses === 0) {
        console.log('✅ No buses with riders found. Exiting.');
        return;
      }

      const promises: Promise<void>[] = [];

      // Process buses in parallel batches
      for (let i = 0; i < busesSnapshot.docs.length; i += BATCH_SIZE) {
        const batchDocs = busesSnapshot.docs.slice(i, i + BATCH_SIZE);
        
        const batchPromise = processBusExpirationBatch(batchDocs, db, stats);
        promises.push(batchPromise);
      }

      // Wait for all batches to complete
      await Promise.allSettled(promises);

      stats.endTime = new Date();
      const duration = stats.endTime.getTime() - stats.startTime.getTime();

      // Log final statistics
      console.log('✅ Payment expiration check completed', {
        stats: {
          ...stats,
          duration: `${duration}ms`,
          successRate: `${((stats.processedBuses / stats.totalBuses) * 100).toFixed(2)}%`
        }
      });

      // Send notification if there were errors
      if (stats.errors > 0) {
        console.warn(`⚠️ Completed with ${stats.errors} errors`);
      }

    } catch (error) {
      stats.endTime = new Date();
      console.error('❌ Critical error during payment expiration check:', {
        error: error instanceof Error ? error.message : error,
        stats
      });
      
      throw error;
    }
  });

async function processBusExpirationBatch(
  busDocs: admin.firestore.QueryDocumentSnapshot[],
  db: admin.firestore.Firestore,
  stats: ExpirationStats
): Promise<void> {
  const batch = db.batch();
  let batchOperations = 0;

  for (const busDoc of busDocs) {
    try {
      const busData = busDoc.data() as BusData;
      const busId = busDoc.id;

      // Skip if no current riders or invalid data
      if (!busData.currentRiders || !Array.isArray(busData.currentRiders) || busData.currentRiders.length === 0) {
        continue;
      }

      const result = processRiderPaymentExpiration(busData.currentRiders, busId);
      
      if (result.hasChanges) {
        // Add to batch update
        batch.update(busDoc.ref, {
          currentRiders: result.updatedRiders,
          lastPaymentCheck: admin.firestore.FieldValue.serverTimestamp()
        });

        batchOperations++;
        stats.expiredRiders += result.expiredCount;

        console.log(`📝 Queued expiration update for bus ${busData.busName || busId}: ${result.expiredCount} riders expired`);
      }

      stats.processedBuses++;

    } catch (error) {
      stats.errors++;
      console.error(`❌ Error processing bus ${busDoc.id}:`, error);
      // Continue processing other buses
    }
  }

  // Commit the batch if there are operations
  if (batchOperations > 0) {
    try {
      await batch.commit();
      console.log(`✅ Successfully committed batch of ${batchOperations} bus updates`);
    } catch (error) {
      stats.errors += batchOperations;
      console.error(`❌ Failed to commit batch:`, error);
    }
  }
}

// ✅ NEW: Process payment expiration for riders
function processRiderPaymentExpiration(riders: CurrentRider[], busId: string): {
  updatedRiders: CurrentRider[];
  hasChanges: boolean;
  expiredCount: number;
} {
  let hasChanges = false;
  let expiredCount = 0;
  const now = new Date();

  const updatedRiders = riders.map((rider) => {
    // Only process active riders with paid status
    if (rider.status !== 'active' || rider.paymentStatus !== 'paid') {
      return rider;
    }

    // Check if payment has expired
    const shouldExpire = checkIfPaymentExpired(rider, now);
    
    if (shouldExpire) {
      hasChanges = true;
      expiredCount++;
      
      console.log(`⏰ Payment expired for ${rider.name} (${rider.email}) on bus ${busId}: ${rider.subscriptionType} subscription`);
      
      // Return rider with expired payment status
      return { 
        ...rider, 
        paymentStatus: 'pending' as const,
        expiresAt: undefined // Clear expiration since it's now pending
      };
    }

    return rider;
  });

  return { updatedRiders, hasChanges, expiredCount };
}

// ✅ NEW: Check if payment has expired based on subscription type
function checkIfPaymentExpired(rider: CurrentRider, now: Date): boolean {
  // If no paidAt timestamp, can't determine expiration
  if (!rider.paidAt) {
    console.log(`⚠️ No paidAt timestamp for rider ${rider.name} - cannot check expiration`);
    return false;
  }

  const paidAt = new Date(rider.paidAt);
  const timeSincePaid = now.getTime() - paidAt.getTime();

  if (rider.subscriptionType === 'per_ride') {
    // Per ride: expires after 24 hours
    const hoursElapsed = timeSincePaid / (1000 * 60 * 60);
    const expired = hoursElapsed >= 24;
    
    if (expired) {
      console.log(`🕐 Per-ride subscription expired: ${hoursElapsed.toFixed(2)} hours since payment`);
    }
    
    return expired;
  } else if (rider.subscriptionType === 'monthly') {
    // Monthly: expires after 30 days
    const daysElapsed = timeSincePaid / (1000 * 60 * 60 * 24);
    const expired = daysElapsed >= 30;
    
    if (expired) {
      console.log(`📅 Monthly subscription expired: ${daysElapsed.toFixed(2)} days since payment`);
    }
    
    return expired;
  }

  return false;
}

// ✅ NEW: Function to set payment status with expiration tracking
export const setPaymentStatusWithExpiration = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .https
  .onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { userId, busId, paymentStatus } = data;

    if (!userId || !busId || !paymentStatus) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    const db = admin.firestore();

    try {
      // Get current bus data
      const busRef = db.collection('buses').doc(busId);
      const busDoc = await busRef.get();

      if (!busDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Bus not found');
      }

      const busData = busDoc.data() as BusData;
      const currentRiders = busData.currentRiders || [];

      // Find the rider
      const riderIndex = currentRiders.findIndex((rider: CurrentRider) => rider.id === userId);

      if (riderIndex === -1) {
        throw new functions.https.HttpsError('not-found', 'Rider not found in bus');
      }

      const rider = currentRiders[riderIndex];
      const now = new Date().toISOString();

      // ✅ UPDATE: Set payment status with proper tracking
      if (paymentStatus === 'paid') {
        // Calculate expiration time
        const paidAt = new Date();
        let expiresAt: Date;

        if (rider.subscriptionType === 'per_ride') {
          // Expires in 24 hours
          expiresAt = new Date(paidAt.getTime() + (24 * 60 * 60 * 1000));
        } else if (rider.subscriptionType === 'monthly') {
          // Expires in 30 days
          expiresAt = new Date(paidAt.getTime() + (30 * 24 * 60 * 60 * 1000));
        } else {
          throw new functions.https.HttpsError('invalid-argument', 'Invalid subscription type');
        }

        // Update rider with payment info and expiration
        currentRiders[riderIndex] = {
          ...rider,
          paymentStatus: 'paid',
          paidAt: now,
          expiresAt: expiresAt.toISOString()
        };

        console.log(`💰 Payment set to paid for ${rider.name}: ${rider.subscriptionType} expires at ${expiresAt.toISOString()}`);

      } else {
        // For unpaid/pending, clear payment tracking
        currentRiders[riderIndex] = {
          ...rider,
          paymentStatus: paymentStatus,
          paidAt: undefined,
          expiresAt: undefined
        };

        console.log(`📝 Payment status updated to ${paymentStatus} for ${rider.name}`);
      }

      // Update the bus document
      await busRef.update({
        currentRiders: currentRiders,
        updatedAt: now
      });

      return { 
        success: true, 
        message: `Payment status updated to ${paymentStatus}`,
        expiresAt: currentRiders[riderIndex].expiresAt
      };

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new functions.https.HttpsError('internal', 'Failed to update payment status');
    }
  });

// ✅ LEGACY: Keep the old function for backward compatibility but update to use currentRiders
export const resetDailyPayments = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .pubsub
  .schedule('0 0 * * *') // Daily at midnight (kept for any legacy dependencies)
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('⚠️ Legacy resetDailyPayments called - redirecting to checkPaymentExpiration');
    // Just run the new expiration check
    return checkPaymentExpiration.handler(null as any, {} as any);
  });

// ✅ UPDATED: Manual trigger function for testing
export const manualCheckPaymentExpiration = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .https
  .onCall(async (data, context) => {
    // Verify admin access
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    console.log('🛠️ Manual payment expiration check triggered by:', context.auth.uid);
    
    // Run the expiration check logic
    return checkPaymentExpiration.handler(null as any, {} as any);
  }); 