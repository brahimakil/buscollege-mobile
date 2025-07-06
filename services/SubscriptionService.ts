import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface SubscriptionData {
  busId: string;
  locationId: string | null;
  subscriptionType: 'monthly' | 'per_ride';
  paymentStatus: 'pending' | 'paid' | 'unpaid';
  status: 'active' | 'inactive'; // ✅ active = subscribed, inactive = unsubscribed
  assignedAt: string;
  startDate: string;
  endDate?: string;
  unsubscribedAt?: string;
  updatedAt: string;
  qrCode: string;
  subscriptionId: string;
  subscriberName: string;
  subscriberEmail: string;
}

// ✅ Complete rider data stored in bus currentRiders array
export interface CurrentRiderData {
  id: string; // userId
  name: string;
  email: string;
  
  // Complete subscription data in currentRiders
  busId: string;
  locationId: string | null;
  paymentStatus: 'pending' | 'paid' | 'unpaid';
  status: 'active' | 'inactive'; // ✅ active = subscribed, inactive = unsubscribed
  subscriptionType: 'monthly' | 'per_ride';
  assignedAt: string;
  startDate: string;
  endDate?: string;
  qrCode: string;
  subscriptionId: string;
  subscriberName: string;
  subscriberEmail: string;
  updatedAt: string;
}

export class SubscriptionService {
  
  private static generateQRCodeData(userId: string, busId: string, subscriptionId: string): string {
    return JSON.stringify({
      userId,
      busId,
      subscriptionId,
      timestamp: Date.now(),
      type: 'bus_subscription'
    });
  }

  private static generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * ✅ FIXED: Subscribe to bus - ENSURE status is 'active' and handle duplicates
   */
  static async subscribeToBus(
    userId: string,
    busId: string,
    subscriptionType: 'monthly' | 'per_ride',
    locationId: string | null = null
  ): Promise<void> {
    try {
      console.log(`🚌 Starting subscription process for user ${userId} to bus ${busId}`);

      // Get current user data
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();

      // Get bus data and validate
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus route not found');
      }

      const busData = busDoc.data();
      let currentRiders = busData.currentRiders || [];
      
      // ✅ IMPROVED: Check for ANY existing entry and remove it first
      const existingRiderIndex = currentRiders.findIndex((rider: any) => rider.id === userId);
      
      if (existingRiderIndex !== -1) {
        console.log('🧹 Found existing rider entry, removing it first...');
        const existingRider = currentRiders[existingRiderIndex];
        
        // Remove the existing entry
        await updateDoc(busRef, {
          currentRiders: arrayRemove(existingRider),
          updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Removed existing rider entry');
      }

      // Check capacity (after potential removal)
      const riderCount = currentRiders.length - (existingRiderIndex !== -1 ? 1 : 0);
      if (riderCount >= busData.maxCapacity) {
        throw new Error('This bus route is at full capacity');
      }

      // Create complete subscription data
      const subscriptionId = this.generateSubscriptionId();
      const qrCodeData = this.generateQRCodeData(userId, busId, subscriptionId);
      const now = new Date().toISOString();

      let endDate: string | undefined;
      if (subscriptionType === 'monthly') {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        endDate = end.toISOString();
      }

      // ✅ FORCE status to be 'active' - add explicit logging
      const currentRiderData: CurrentRiderData = {
        id: userId,
        name: userData.name,
        email: userData.email,
        
        // Complete subscription data
        busId,
        locationId,
        paymentStatus: 'pending',
        status: 'active', // ✅ EXPLICITLY SET TO ACTIVE
        subscriptionType,
        assignedAt: now,
        startDate: now,
        ...(endDate ? { endDate } : {}),
        qrCode: qrCodeData,
        subscriptionId,
        subscriberName: userData.name,
        subscriberEmail: userData.email,
        updatedAt: now
      };

      // ✅ ADD EXPLICIT LOGGING
      console.log('🔍 CREATING RIDER DATA:', {
        userId,
        status: currentRiderData.status,
        paymentStatus: currentRiderData.paymentStatus,
        subscriptionId: currentRiderData.subscriptionId
      });

      // Add to bus currentRiders
      await updateDoc(busRef, {
        currentRiders: arrayUnion(currentRiderData),
        updatedAt: now
      });

      // ✅ VERIFY what was actually saved
      console.log('🔍 VERIFYING SAVED DATA...');
      const updatedBusDoc = await getDoc(busRef);
      if (updatedBusDoc.exists()) {
        const updatedBusData = updatedBusDoc.data();
        const savedRider = updatedBusData.currentRiders?.find((rider: any) => rider.id === userId);
        console.log('🔍 SAVED RIDER DATA:', {
          found: !!savedRider,
          status: savedRider?.status,
          paymentStatus: savedRider?.paymentStatus,
          subscriptionId: savedRider?.subscriptionId
        });
      }

      console.log('✅ Successfully subscribed with ACTIVE status and PENDING payment');
    } catch (error) {
      console.error('❌ Error subscribing to bus:', error);
      throw error;
    }
  }

  /**
   * ✅ UPDATED: Update payment status with automatic expiration tracking
   */
  static async updatePaymentStatus(
    userId: string, 
    busId: string, 
    paymentStatus: 'pending' | 'paid' | 'unpaid'
  ): Promise<void> {
    try {
      console.log(`🔄 Updating payment status for user ${userId} on bus ${busId} to ${paymentStatus}`);
      
      // Get current bus data
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus not found');
      }
      
      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      // Find the rider in currentRiders
      const riderIndex = currentRiders.findIndex((rider: any) => 
        rider.id === userId || rider.userId === userId
      );
      
      if (riderIndex === -1) {
        throw new Error('Rider not found in bus currentRiders');
      }
      
      const rider = currentRiders[riderIndex];
      const now = new Date().toISOString();
      
      // ✅ NEW: Handle payment status with expiration tracking
      if (paymentStatus === 'paid') {
        // Calculate expiration time based on subscription type
        const paidAt = new Date();
        let expiresAt: Date;

        if (rider.subscriptionType === 'per_ride') {
          // Expires in 24 hours
          expiresAt = new Date(paidAt.getTime() + (24 * 60 * 60 * 1000));
          console.log(`⏰ Per-ride payment will expire in 24 hours: ${expiresAt.toISOString()}`);
        } else if (rider.subscriptionType === 'monthly') {
          // Expires in 30 days
          expiresAt = new Date(paidAt.getTime() + (30 * 24 * 60 * 60 * 1000));
          console.log(`📅 Monthly payment will expire in 30 days: ${expiresAt.toISOString()}`);
        } else {
          throw new Error('Invalid subscription type for expiration calculation');
        }

        // Update rider with payment tracking
        currentRiders[riderIndex] = {
          ...rider,
          paymentStatus: 'paid',
          paidAt: now,
          expiresAt: expiresAt.toISOString()
        };

      } else {
        // For unpaid/pending, clear payment tracking
        currentRiders[riderIndex] = {
          ...rider,
          paymentStatus: paymentStatus,
          paidAt: undefined,
          expiresAt: undefined
        };
      }
      
      // Update bus document
      await updateDoc(busRef, {
        currentRiders: currentRiders,
        updatedAt: now
      });
      
      console.log(`✅ Payment status updated successfully: ${paymentStatus}`);
      
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * ✅ UPDATED: Get user subscriptions by searching ALL buses for user in currentRiders
   */
  static async getUserSubscriptions(userId: string): Promise<SubscriptionData[]> {
    try {
      console.log(`🔍 Finding subscriptions for user ${userId} by searching all buses...`);
      
      // ✅ NEW APPROACH: Find user subscriptions by searching through ALL buses
      // This is more efficient than the user having references
      const subscriptions: SubscriptionData[] = [];
      
      // Get all buses and check if user is in their currentRiders
      const busesSnapshot = await getDocs(collection(db, 'buses'));
      
      for (const busDoc of busesSnapshot.docs) {
        const busData = busDoc.data();
        const currentRiders = busData.currentRiders || [];
        
        // Find this user in currentRiders
        const userRiderData = currentRiders.find((rider: any) => rider.id === userId);
        
        if (userRiderData) {
          // Convert currentRider format to SubscriptionData format
          const subscriptionData: SubscriptionData = {
            busId: userRiderData.busId,
            locationId: userRiderData.locationId,
            subscriptionType: userRiderData.subscriptionType,
            paymentStatus: userRiderData.paymentStatus,
            status: userRiderData.status, // active or inactive
            assignedAt: userRiderData.assignedAt,
            startDate: userRiderData.startDate,
            endDate: userRiderData.endDate,
            updatedAt: userRiderData.updatedAt,
            qrCode: userRiderData.qrCode,
            subscriptionId: userRiderData.subscriptionId,
            subscriberName: userRiderData.subscriberName,
            subscriberEmail: userRiderData.subscriberEmail
          };
          
          subscriptions.push(subscriptionData);
          console.log(`✅ Found subscription for user in bus: ${busDoc.id}`);
        }
      }
      
      console.log(`📱 Found ${subscriptions.length} subscriptions by searching currentRiders`);
      return subscriptions;
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * ✅ FIXED: QR code access based on payment status (not subscription status)
   */
  static async canAccessQRCode(userId: string, busId: string): Promise<boolean> {
    try {
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        return false;
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      const rider = currentRiders.find((rider: any) => rider.id === userId);
      
      if (!rider) {
        return false;
      }

      // ✅ FIXED: QR access based on payment status AND subscription status
      return rider.status === 'active' && rider.paymentStatus === 'paid';
    } catch (error) {
      console.error('Error checking QR code access:', error);
      return false;
    }
  }

  /**
   * ✅ UPDATED: Get QR code from currentRiders
   */
  static async getSubscriptionQRCode(userId: string, busId: string): Promise<string | null> {
    try {
      const canAccess = await this.canAccessQRCode(userId, busId);
      if (!canAccess) {
        return null;
      }

      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        return null;
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      const rider = currentRiders.find((rider: any) => rider.id === userId);
      
      return rider?.qrCode || null;
    } catch (error) {
      console.error('Error getting QR code:', error);
      return null;
    }
  }

  /**
   * ✅ FIXED: Unsubscribe - set status to 'inactive' instead of removing
   */
  static async unsubscribeFromBus(userId: string, busId: string): Promise<void> {
    try {
      console.log(`🚌 Starting unsubscription process for user ${userId} from bus ${busId}`);
      
      // Get bus data
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus not found');
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      const riderIndex = currentRiders.findIndex((rider: any) => rider.id === userId);
      
      if (riderIndex === -1) {
        throw new Error('User not found in current riders');
      }

      const riderToUpdate = currentRiders[riderIndex];
      const now = new Date().toISOString();

      // ✅ FIXED: For unpaid/pending - completely remove, for paid - set to inactive
      if (riderToUpdate.paymentStatus === 'unpaid' || riderToUpdate.paymentStatus === 'pending') {
        console.log(`🗑️ Removing ${riderToUpdate.paymentStatus} subscription completely`);
        
        // Remove completely
        await updateDoc(busRef, {
          currentRiders: arrayRemove(riderToUpdate),
          updatedAt: now
        });

        console.log('✅ Completely removed unpaid/pending subscription');
        
      } else {
        // For paid subscriptions: Set status to 'inactive' (keep for history)
        console.log(`📝 Setting paid subscription to inactive`);
        
        const updatedRiders = [...currentRiders];
        updatedRiders[riderIndex] = {
          ...riderToUpdate,
          status: 'inactive', // ✅ Set to inactive instead of removing
          unsubscribedAt: now,
          updatedAt: now
        };

        await updateDoc(busRef, {
          currentRiders: updatedRiders,
          updatedAt: now
        });

        console.log('✅ Set paid subscription to inactive status');
      }

    } catch (error) {
      console.error('❌ Error unsubscribing from bus:', error);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Cancel subscription - completely remove from currentRiders only
   */
  static async cancelPendingSubscription(userId: string, busId: string): Promise<void> {
    try {
      console.log(`❌ Canceling subscription for user ${userId} from bus ${busId}`);
      
      // ✅ NEW LOGIC: Only work with bus currentRiders array
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus not found');
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      // ✅ Find the rider in currentRiders array (as object, not string)
      const riderToRemove = currentRiders.find((rider: any) => rider.id === userId);

      if (!riderToRemove) {
        throw new Error('Subscription not found');
      }

      console.log(`🔍 Found rider to cancel:`, {
        name: riderToRemove.name,
        status: riderToRemove.status,
        paymentStatus: riderToRemove.paymentStatus,
        subscriptionType: riderToRemove.subscriptionType
      });

      const now = new Date().toISOString();

      // ✅ SIMPLE: Just remove from currentRiders (no matter what payment status)
      await updateDoc(busRef, {
        currentRiders: arrayRemove(riderToRemove),
        updatedAt: now
      });

      console.log(`✅ Completely removed rider from currentRiders`);
      console.log('✅ Successfully canceled subscription - completely removed from database');
    } catch (error) {
      console.error('❌ Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Check subscription status from currentRiders only
   */
  static async isSubscribedToBus(userId: string, busId: string): Promise<boolean> {
    try {
      // ✅ Check bus currentRiders instead of user busAssignments
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        return false;
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];

      // Find user in currentRiders with active status
      const rider = currentRiders.find((rider: any) => 
        rider.id === userId && rider.status === 'active'
      );

      return !!rider;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * ✅ FIXED: Validate subscription from currentRiders only
   */
  static async validateSubscriptionStatus(userId: string, busId: string): Promise<{
    isSubscribed: boolean;
    isActive: boolean;
    subscription?: any;
    reason?: string;
  }> {
    try {
      // ✅ Check from bus currentRiders (single source of truth)
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        return { 
          isSubscribed: false, 
          isActive: false, 
          reason: 'Bus not found' 
        };
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      const rider = currentRiders.find((rider: any) => rider.id === userId);
      
      if (!rider) {
        return { 
          isSubscribed: false, 
          isActive: false, 
          reason: 'Not subscribed to this bus' 
        };
      }

      const isActive = rider.status === 'active';

      return {
        isSubscribed: true,
        isActive,
        subscription: {
          paymentStatus: rider.paymentStatus,
          subscriptionType: rider.subscriptionType,
          status: rider.status,
          busId,
          assignedAt: rider.assignedAt,
          startDate: rider.startDate,
          endDate: rider.endDate
        },
        reason: isActive ? 'Active subscription' : 'Inactive subscription'
      };
    } catch (error) {
      console.error('Error validating subscription:', error);
      return { 
        isSubscribed: false, 
        isActive: false, 
        reason: 'Error checking subscription' 
      };
    }
  }

  /**
   * Clean up inconsistent subscription data
   */
  private static async cleanupUserSubscription(userId: string, busId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentAssignments = userData.busAssignments || [];
        
        const subscriptionToUpdate = currentAssignments.find(
          (assignment: any) => assignment.busId === busId && assignment.status === 'active'
        );

        if (subscriptionToUpdate) {
          const now = new Date().toISOString();
          const updatedSubscription: SubscriptionData = {
            ...subscriptionToUpdate,
            status: 'unsubscribed',
            unsubscribedAt: now,
            updatedAt: now
          };

          // Remove old and add updated subscription
          await updateDoc(userRef, {
            busAssignments: arrayRemove(subscriptionToUpdate),
            updatedAt: now
          });

          await updateDoc(userRef, {
            busAssignments: arrayUnion(updatedSubscription),
            updatedAt: now
          });

          console.log('Cleaned up inconsistent subscription data');
        }
      }
    } catch (error) {
      console.error('Error cleaning up subscription:', error);
    }
  }

  /**
   * Check if user has returned to bus and update subscription status accordingly
   */
  static async checkUserReturnedToBus(userId: string, busId: string): Promise<{
    hasReturned: boolean;
    subscription?: SubscriptionData;
    canAccessQR: boolean;
  }> {
    try {
      console.log(`🔄 Checking if user ${userId} has returned to bus ${busId}`);
      
      // Get current bus data
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        return { hasReturned: false, canAccessQR: false };
      }

      const busData = busDoc.data();
      const isUserInCurrentRiders = busData.currentRiders?.some((rider: any) => rider.id === userId) || false;
      
      // Get user's subscription data
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return { hasReturned: false, canAccessQR: false };
      }

      const userData = userDoc.data();
      const subscription = userData.busAssignments?.find(
        (assignment: any) => assignment.busId === busId
      );

      if (!subscription) {
        return { hasReturned: false, canAccessQR: false };
      }

      // Check if user has returned (is in currentRiders but subscription was previously ended)
      const hasReturned = isUserInCurrentRiders;
      
      // User can access QR if they're in the bus AND payment is confirmed by admin
      const canAccessQR = hasReturned && 
                         subscription.status === 'active' && 
                         subscription.paymentStatus === 'paid';

      console.log(`🔄 User return status:`, {
        hasReturned,
        isInCurrentRiders: isUserInCurrentRiders,
        subscriptionStatus: subscription.status,
        paymentStatus: subscription.paymentStatus,
        canAccessQR
      });

      return {
        hasReturned,
        subscription,
        canAccessQR
      };

    } catch (error) {
      console.error('Error checking user return status:', error);
      return { hasReturned: false, canAccessQR: false };
    }
  }

  /**
   * Update subscription status when user returns to bus
   */
  static async handleUserReturnToBus(userId: string, busId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentAssignments = userData.busAssignments || [];
      
      const subscriptionToUpdate = currentAssignments.find(
        (assignment: any) => assignment.busId === busId
      );

      if (!subscriptionToUpdate) {
        throw new Error('Subscription not found');
      }

      const now = new Date().toISOString();
      
      // Update subscription to active status (admin will set payment status)
      const updatedSubscription: SubscriptionData = {
        ...subscriptionToUpdate,
        status: 'active',
        updatedAt: now
      };

      // Remove old subscription and add updated one
      await updateDoc(userRef, {
        busAssignments: arrayRemove(subscriptionToUpdate),
        updatedAt: now
      });

      await updateDoc(userRef, {
        busAssignments: arrayUnion(updatedSubscription),
        updatedAt: now
      });

      console.log(`✅ Updated subscription status to active for returned user`);
    } catch (error) {
      console.error('Error handling user return to bus:', error);
      throw error;
    }
  }

  /**
   * Check if user is actually subscribed and in bus currentRiders
   */
  static async isUserActivelySubscribed(userId: string, busId: string): Promise<boolean> {
    try {
      // Check user's subscription data
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const subscription = userData.busAssignments?.find(
        (assignment: any) => assignment.busId === busId && assignment.status === 'active'
      );

      if (!subscription) {
        return false;
      }

      // Check if user is in bus's currentRiders
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        return false;
      }

      const busData = busDoc.data();
      const isInCurrentRiders = busData.currentRiders?.some((rider: any) => rider.id === userId) || false;

      console.log(`🔍 Active subscription check for user ${userId} on bus ${busId}:`, {
        hasSubscription: !!subscription,
        subscriptionStatus: subscription.status,
        isInCurrentRiders,
        result: isInCurrentRiders
      });

      return isInCurrentRiders;
    } catch (error) {
      console.error('Error checking active subscription:', error);
      return false;
    }
  }

  /**
   * Admin function to remove a user from a bus - removes from both collections
   */
  static async adminRemoveUserFromBus(userId: string, busId: string, adminId: string): Promise<void> {
    try {
      console.log(`🔧 Admin ${adminId} removing user ${userId} from bus ${busId}`);
      
      // Get current user data
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentAssignments = userData.busAssignments || [];

      // Find ALL active subscriptions for this bus (to handle duplicates)
      const activeSubscriptions = currentAssignments.filter(
        (assignment: any) => assignment.busId === busId && assignment.status === 'active'
      );

      if (activeSubscriptions.length === 0) {
        throw new Error('No active subscriptions found for this bus');
      }

      // Get bus data
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus not found');
      }

      const now = new Date().toISOString();

      // Mark ALL active subscriptions as ended by admin
      const updatedSubscriptions = activeSubscriptions.map((subscription: any) => ({
        ...subscription,
        status: 'unsubscribed',
        unsubscribedAt: now,
        unsubscribedBy: 'admin',
        adminId: adminId,
        updatedAt: now
      }));

      // Remove all old active subscriptions
      for (const subscription of activeSubscriptions) {
        await updateDoc(userRef, {
          busAssignments: arrayRemove(subscription)
        });
      }

      // Add updated subscriptions
      for (const updatedSubscription of updatedSubscriptions) {
        await updateDoc(userRef, {
          busAssignments: arrayUnion(updatedSubscription)
        });
      }

      // Update user document
      await updateDoc(userRef, {
        updatedAt: now
      });

      console.log(`✅ Updated ${activeSubscriptions.length} user subscriptions to unsubscribed by admin`);

      // Remove user from bus currentRiders
      await updateDoc(busRef, {
        currentRiders: arrayRemove(userId),
        updatedAt: now
      });

      console.log(`✅ Removed user from bus currentRiders`);
      console.log('✅ Successfully removed user from bus by admin');
    } catch (error) {
      console.error('❌ Error in admin removal:', error);
      throw error;
    }
  }

  /**
   * Clean up duplicate subscriptions for a user
   */
  static async cleanupDuplicateSubscriptions(userId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up duplicate subscriptions for user ${userId}`);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const busAssignments = userData.busAssignments || [];

      // Group subscriptions by busId and status
      const subscriptionGroups: { [key: string]: any[] } = {};
      
      busAssignments.forEach((assignment: any) => {
        const key = `${assignment.busId}_${assignment.status}`;
        if (!subscriptionGroups[key]) {
          subscriptionGroups[key] = [];
        }
        subscriptionGroups[key].push(assignment);
      });

      // Find duplicates (more than 1 active subscription per bus)
      const duplicatesToRemove: any[] = [];
      const subscriptionsToKeep: any[] = [];

      Object.entries(subscriptionGroups).forEach(([key, subscriptions]) => {
        if (key.endsWith('_active') && subscriptions.length > 1) {
          // Keep the most recent subscription, remove others
          const sorted = subscriptions.sort((a, b) => 
            new Date(b.assignedAt || b.startDate).getTime() - new Date(a.assignedAt || a.startDate).getTime()
          );
          
          subscriptionsToKeep.push(sorted[0]); // Keep the most recent
          duplicatesToRemove.push(...sorted.slice(1)); // Remove the rest
          
          console.log(`🔍 Found ${subscriptions.length} active subscriptions for bus ${subscriptions[0].busId}, keeping most recent`);
        } else {
          // No duplicates, keep all
          subscriptionsToKeep.push(...subscriptions);
        }
      });

      if (duplicatesToRemove.length > 0) {
        // Remove duplicates
        for (const duplicate of duplicatesToRemove) {
          await updateDoc(userRef, {
            busAssignments: arrayRemove(duplicate)
          });
        }

        await updateDoc(userRef, {
          updatedAt: new Date().toISOString()
        });

        console.log(`✅ Removed ${duplicatesToRemove.length} duplicate subscriptions`);
      } else {
        console.log('✅ No duplicate subscriptions found');
      }
    } catch (error) {
      console.error('❌ Error cleaning up duplicates:', error);
      throw error;
    }
  }

  /**
   * Resubscribe to a bus route (for users who previously had a subscription)
   */
  static async resubscribeToBus(
    userId: string,
    busId: string,
    subscriptionType: 'monthly' | 'per_ride',
    locationId: string | null = null
  ): Promise<void> {
    try {
      console.log(`🔄 Resubscribing user ${userId} to bus ${busId}`);

      // First clean up any old subscriptions
      await this.cleanupDuplicateSubscriptions(userId);

      // Get current user data
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentAssignments = userData.busAssignments || [];

      // Check for any existing active subscription
      const existingActiveSubscription = currentAssignments.find(
        (assignment: any) => 
          assignment.busId === busId && assignment.status === 'active'
      );

      if (existingActiveSubscription) {
        throw new Error('You already have an active subscription to this bus route');
      }

      // Mark any old subscriptions as replaced
      const oldSubscriptions = currentAssignments.filter(
        (assignment: any) => assignment.busId === busId
      );

      for (const oldSub of oldSubscriptions) {
        if (oldSub.status !== 'active') {
          const updatedOldSub = {
            ...oldSub,
            status: 'replaced',
            replacedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await updateDoc(userRef, {
            busAssignments: arrayRemove(oldSub)
          });

          await updateDoc(userRef, {
            busAssignments: arrayUnion(updatedOldSub)
          });
        }
      }

      // Now create new subscription using the regular subscribe method
      await this.subscribeToBus(userId, busId, subscriptionType, locationId);

      console.log('✅ Successfully resubscribed to bus route');
    } catch (error) {
      console.error('❌ Error resubscribing to bus:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Cleanup function to remove busAssignments from user collection
   */
  static async cleanupUserBusAssignments(userId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up busAssignments for user ${userId}`);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();
      
      if (userData.busAssignments && userData.busAssignments.length > 0) {
        // Remove the entire busAssignments array
        await updateDoc(userRef, {
          busAssignments: [],
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Cleaned up ${userData.busAssignments.length} busAssignments entries`);
      } else {
        console.log(`✅ No busAssignments to clean up`);
      }
    } catch (error) {
      console.error('Error cleaning up busAssignments:', error);
    }
  }

  /**
   * ✅ DEBUG: Method to check and fix any rider with wrong status
   */
  static async debugAndFixRiderStatus(userId: string, busId: string): Promise<void> {
    try {
      console.log(`🔍 DEBUG: Checking rider status for user ${userId} on bus ${busId}`);
      
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        console.log('❌ Bus not found');
        return;
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      const riderIndex = currentRiders.findIndex((rider: any) => rider.id === userId);
      
      if (riderIndex === -1) {
        console.log('❌ Rider not found in currentRiders');
        return;
      }

      const rider = currentRiders[riderIndex];
      console.log('🔍 CURRENT RIDER DATA:', {
        status: rider.status,
        paymentStatus: rider.paymentStatus,
        subscriptionId: rider.subscriptionId,
        assignedAt: rider.assignedAt
      });

      // Fix status if it's wrong
      if (rider.status !== 'active') {
        console.log('🔧 FIXING STATUS: Setting to active...');
        
        const updatedRiders = [...currentRiders];
        updatedRiders[riderIndex] = {
          ...rider,
          status: 'active',
          updatedAt: new Date().toISOString()
        };

        await updateDoc(busRef, {
          currentRiders: updatedRiders,
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Status fixed to active');
      } else {
        console.log('✅ Status is already active');
      }

    } catch (error) {
      console.error('❌ Error in debug method:', error);
    }
  }
} 