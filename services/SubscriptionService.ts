import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface SubscriptionData {
  busId: string;
  locationId: string | null;
  subscriptionType: 'monthly' | 'per_ride';
  paymentStatus: 'pending' | 'paid' | 'unpaid';
  status: 'active' | 'unsubscribed' | 'expired';
  assignedAt: string;
  startDate?: string;
  endDate?: string;
  unsubscribedAt?: string;
  updatedAt?: string;
  qrCode?: string;
  subscriptionId?: string;
  subscriberName?: string;
  subscriberEmail?: string;
}

export interface BusSubscriber {
  userId: string;
  name: string;
  email: string;
  subscriptionType: 'monthly' | 'per_ride';
  subscribedAt: string;
  paymentStatus: 'pending' | 'paid' | 'unpaid';
  status: 'active' | 'unsubscribed' | 'expired';
  unsubscribedAt?: string;
}

export class SubscriptionService {
  /**
   * Generate QR code data for subscription
   */
  private static generateQRCodeData(userId: string, busId: string, subscriptionId: string): string {
    const qrData = {
      userId,
      busId,
      subscriptionId,
      timestamp: Date.now(),
      type: 'bus_subscription'
    };
    return JSON.stringify(qrData);
  }

  /**
   * Generate a unique subscription ID
   */
  private static generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe to a bus route with smart cleanup (only removes old subscriptions)
   */
  static async subscribeToBus(
    userId: string,
    busId: string,
    subscriptionType: 'monthly' | 'per_ride',
    locationId: string | null = null
  ): Promise<void> {
    try {
      console.log(`🚌 Starting subscription process for user ${userId} to bus ${busId}`);

      // STEP 1: Clean up any existing duplicates first
      await this.cleanupDuplicateSubscriptions(userId);

      // STEP 2: Get current user data and check for existing active subscriptions
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentAssignments = userData.busAssignments || [];

      // ENHANCED VALIDATION - Check for existing active subscription AND verify with bus currentRiders
      const existingActiveSubscription = currentAssignments.find(
        (assignment: any) => 
          assignment.busId === busId && assignment.status === 'active'
      );

      if (existingActiveSubscription) {
        // Double-check: verify user is actually in bus currentRiders
        const busRef = doc(db, 'buses', busId);
        const busDoc = await getDoc(busRef);
        
        if (busDoc.exists()) {
          const busData = busDoc.data();
          const currentRiders = busData.currentRiders || [];
          
          const isInCurrentRiders = currentRiders.some((rider: any) => {
            if (typeof rider === 'string') {
              return rider === userId;
            } else if (typeof rider === 'object' && rider.id) {
              return rider.id === userId;
            }
            return false;
          });

          if (isInCurrentRiders) {
            console.log('⚠️ User already has active subscription and is in currentRiders');
            throw new Error('You already have an active subscription to this bus route');
          } else {
            // User has active subscription but not in currentRiders - clean it up
            console.log('🧹 Found orphaned active subscription, cleaning up...');
            const updatedSubscription = {
              ...existingActiveSubscription,
              status: 'unsubscribed',
              unsubscribedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await updateDoc(userRef, {
              busAssignments: arrayRemove(existingActiveSubscription)
            });

            await updateDoc(userRef, {
              busAssignments: arrayUnion(updatedSubscription)
            });

            console.log('✅ Cleaned up orphaned subscription, proceeding with new subscription');
          }
        }
      }

      // STEP 3: Get bus data and validate
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus route not found');
      }

      const busData = busDoc.data();
      let currentRiders = busData.currentRiders || [];
      
      // STEP 4: Check capacity
      const riderCount = currentRiders.filter((rider: any) => 
        typeof rider === 'string' ? true : rider.id
      ).length;
      
      if (riderCount >= busData.maxCapacity) {
        throw new Error('This bus route is at full capacity');
      }

      // STEP 5: Create subscription data
      const subscriptionId = this.generateSubscriptionId();
      const qrCodeData = this.generateQRCodeData(userId, busId, subscriptionId);
      const now = new Date().toISOString();

      let endDate: string | undefined;
      if (subscriptionType === 'monthly') {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        endDate = end.toISOString();
      }

      const subscriptionData: SubscriptionData = {
        busId,
        locationId,
        subscriptionType,
        paymentStatus: 'pending',
        status: 'active',
        assignedAt: now,
        startDate: now,
        ...(endDate ? { endDate } : {}),
        qrCode: qrCodeData,
        subscriptionId,
        subscriberName: userData.name,
        subscriberEmail: userData.email,
        updatedAt: now
      };

      // STEP 6: Add subscription to user (only once)
      await updateDoc(userRef, {
        busAssignments: arrayUnion(subscriptionData),
        updatedAt: now
      });

      // STEP 7: Add user to bus currentRiders (only if not already there)
      const isAlreadyInRiders = currentRiders.some((rider: any) => 
        typeof rider === 'string' ? rider === userId : rider.id === userId
      );

      if (!isAlreadyInRiders) {
        await updateDoc(busRef, {
          currentRiders: arrayUnion(userId),
          updatedAt: now
        });
      }

      console.log('✅ Successfully created subscription');
    } catch (error) {
      console.error('❌ Error subscribing to bus:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe a rider from a bus route - Mark as unsubscribed instead of removing
   */
  static async unsubscribeFromBus(userId: string, busId: string): Promise<void> {
    try {
      console.log(`🚌 Starting unsubscription process for user ${userId} from bus ${busId}`);
      
      // Get current user data
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentAssignments = userData.busAssignments || [];

      // Find the active subscription
      const activeSubscription = currentAssignments.find(
        (assignment: any) => assignment.busId === busId && assignment.status === 'active'
      );

      if (!activeSubscription) {
        throw new Error('Active subscription not found');
      }

      // Get bus data
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus not found');
      }

      const now = new Date().toISOString();

      // Create updated subscription with unsubscribed status
      const updatedSubscription: SubscriptionData = {
        ...activeSubscription,
        status: 'unsubscribed',
        unsubscribedAt: now,
        updatedAt: now
      };

      // Remove old subscription and add updated one
      await updateDoc(userRef, {
        busAssignments: arrayRemove(activeSubscription),
        updatedAt: now
      });

      await updateDoc(userRef, {
        busAssignments: arrayUnion(updatedSubscription),
        updatedAt: now
      });

      console.log(`✅ Updated user subscription status to unsubscribed`);

      // Update bus document - remove from currentRiders ONLY
      await updateDoc(busRef, {
        currentRiders: arrayRemove(userId),
        updatedAt: now
      });

      console.log(`✅ Removed user from bus currentRiders`);
      console.log('✅ Successfully unsubscribed from bus route - subscription marked as unsubscribed');
    } catch (error) {
      console.error('❌ Error unsubscribing from bus:', error);
      throw error;
    }
  }

  /**
   * Check if user is subscribed to a specific bus (active subscription only)
   */
  static async isSubscribedToBus(userId: string, busId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const busAssignments = userData.busAssignments || [];

      return busAssignments.some((assignment: any) => 
        assignment.busId === busId && assignment.status === 'active'
      );
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get user subscriptions with validation against bus currentRiders
   */
  static async getUserSubscriptions(userId: string): Promise<SubscriptionData[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      const busAssignments = userData.busAssignments || [];
      
      // Return ALL subscriptions without validation - let the UI handle display logic
      const validSubscriptions: SubscriptionData[] = [];
      
      for (const assignment of busAssignments) {
        // Skip if assignment is not a proper object
        if (typeof assignment === 'string' || !assignment.busId) {
          continue;
        }
        
        // Include ALL subscriptions regardless of currentRiders status
        validSubscriptions.push(assignment as SubscriptionData);
      }
      
      console.log(`📋 Found ${validSubscriptions.length} subscriptions for user ${userId}`);
      return validSubscriptions;
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * Get user's active subscriptions only
   */
  static async getActiveUserSubscriptions(userId: string): Promise<SubscriptionData[]> {
    try {
      const allSubscriptions = await this.getUserSubscriptions(userId);
      return allSubscriptions.filter(sub => sub.status === 'active');
    } catch (error) {
      console.error('Error fetching active user subscriptions:', error);
      return [];
    }
  }

  /**
   * Check if subscription is active (paid, not expired, and status is active)
   */
  static isSubscriptionActive(subscription: SubscriptionData): boolean {
    // Check status first
    if (subscription.status !== 'active') {
      return false;
    }

    // Check payment status
    if (subscription.paymentStatus !== 'paid') {
      return false;
    }

    // Check expiration for monthly subscriptions
    if (subscription.subscriptionType === 'monthly' && subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      return endDate > now;
    }

    return true;
  }

  /**
   * Real-time subscription validation - checks both user data AND bus subscriber list
   */
  static async validateSubscriptionStatus(userId: string, busId: string): Promise<{
    isSubscribed: boolean;
    isActive: boolean;
    subscription?: SubscriptionData;
    reason?: string;
  }> {
    try {
      // Check user's subscription data
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return { isSubscribed: false, isActive: false, reason: 'User not found' };
      }

      const userData = userDoc.data();
      const userSubscription = userData.busAssignments?.find(
        (assignment: any) => assignment.busId === busId && assignment.status === 'active'
      );

      // Check bus's subscriber list
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        return { isSubscribed: false, isActive: false, reason: 'Bus not found' };
      }

      const busData = busDoc.data();
      
      // FIX: Check if user is in currentRiders (handle both string IDs and objects)
      const isInBusRiders = busData.currentRiders?.some((rider: any) => {
        if (typeof rider === 'string') {
          return rider === userId;
        } else if (typeof rider === 'object' && rider.id) {
          return rider.id === userId;
        }
        return false;
      }) || false;

      // Cross-validate: user must be in both lists for active subscription
      const isSubscribed = !!userSubscription && isInBusRiders;
      
      if (!isSubscribed && userSubscription) {
        console.log(`⚠️ User ${userId} has subscription but not in bus currentRiders`);
      }

      // Check if subscription is active
      const isActive = userSubscription ? this.isSubscriptionActive(userSubscription) : false;
      
      return {
        isSubscribed: !!userSubscription,
        isActive,
        subscription: userSubscription,
        reason: userSubscription ? 
          (isActive ? 'Active subscription' : 'Subscription expired or payment pending') :
          'No active subscription found'
      };

    } catch (error) {
      console.error('Error validating subscription status:', error);
      return { isSubscribed: false, isActive: false, reason: 'Validation error' };
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
   * Update payment status for active subscriptions only
   */
  static async updatePaymentStatus(
    userId: string, 
    busId: string, 
    paymentStatus: 'pending' | 'paid' | 'unpaid'
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentAssignments = userData.busAssignments || [];
      
      const subscriptionToUpdate = currentAssignments.find(
        (assignment: any) => assignment.busId === busId && assignment.status === 'active'
      );

      if (!subscriptionToUpdate) {
        throw new Error('Active subscription not found');
      }

      const now = new Date().toISOString();
      const updatedSubscription: SubscriptionData = {
        ...subscriptionToUpdate,
        paymentStatus,
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

      console.log(`Payment status updated to ${paymentStatus} for user ${userId} on bus ${busId}`);
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Get QR code for active, paid subscriptions only
   */
  static async canAccessQRCode(userId: string, busId: string): Promise<boolean> {
    try {
      const validation = await this.validateSubscriptionStatus(userId, busId);
      return validation.isActive && validation.subscription?.paymentStatus === 'paid';
    } catch (error) {
      console.error('Error checking QR code access:', error);
      return false;
    }
  }

  static async getSubscriptionQRCode(userId: string, busId: string): Promise<string | null> {
    try {
      const canAccess = await this.canAccessQRCode(userId, busId);
      if (!canAccess) {
        return null;
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      const subscription = userData.busAssignments?.find(
        (assignment: any) => assignment.busId === busId && assignment.status === 'active'
      );

      return subscription?.qrCode || null;
    } catch (error) {
      console.error('Error getting QR code:', error);
      return null;
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
      const isUserInCurrentRiders = busData.currentRiders?.includes(userId) || false;
      
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
      const isInCurrentRiders = busData.currentRiders?.includes(userId) || false;

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
} 