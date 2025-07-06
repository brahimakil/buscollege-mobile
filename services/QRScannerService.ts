import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Update the interface to make subscriptionId optional
export interface QRCodeData {
  userId: string;
  busId: string;
  subscriptionId?: string; // Make optional
  timestamp: number;
  type: 'bus_subscription';
}

// Interface for complete rider information after scanning
export interface ScannedRiderInfo {
  isValid: boolean;
  rider?: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    address?: string;
    emergencyContact?: string;
  };
  subscription?: {
    subscriptionId: string;
    subscriptionType: 'monthly' | 'per_ride';
    paymentStatus: 'pending' | 'paid' | 'unpaid';
    status: 'active' | 'unsubscribed' | 'expired';
    startDate: string;
    endDate?: string;
    locationId: string | null;
  };
  bus?: {
    id: string;
    busName: string;
    busLabel: string;
    route: Array<{
      name: string;
      arrivalTimeFrom: string;
      arrivalTimeTo: string;
      order: number;
    }>;
  };
  scanResult: 'valid' | 'expired' | 'invalid_format' | 'user_not_found' | 'subscription_not_found' | 'bus_mismatch' | 'payment_pending' | 'subscription_inactive';
  message: string;
}

export class QRScannerService {
  /**
   * Parse QR code - now handles missing subscriptionId
   */
  static parseQRCode(qrCodeString: string): QRCodeData | null {
    try {
      console.log('🔍 === QR CODE PARSING DEBUG ===');
      console.log('🔍 Raw QR String:', JSON.stringify(qrCodeString));
      
      let cleanedString = qrCodeString.trim();
      
      // Remove outer quotes if present
      if (cleanedString.startsWith('"') && cleanedString.endsWith('"')) {
        cleanedString = cleanedString.slice(1, -1);
      }
      
      // Handle escaped quotes and backslashes
      cleanedString = cleanedString.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      
      console.log('🔍 Cleaned string:', cleanedString);
      
      const parsed = JSON.parse(cleanedString);
      console.log('🔍 Parsed successfully:', parsed);
      
      // Check required fields (subscriptionId is now optional)
      const validation = {
        hasUserId: !!parsed.userId,
        hasBusId: !!parsed.busId,
        hasSubscriptionId: !!parsed.subscriptionId,
        hasTimestamp: !!parsed.timestamp,
        hasCorrectType: parsed.type === 'bus_subscription'
      };
      
      console.log('🔍 Field validation:', validation);
      
      // Only require userId, busId, timestamp, and correct type
      if (!validation.hasUserId || !validation.hasBusId || !validation.hasTimestamp || !validation.hasCorrectType) {
        console.error('❌ Missing critical fields');
        return null;
      }

      if (!validation.hasSubscriptionId) {
        console.log('⚠️ QR code missing subscriptionId - will search for active subscription');
      }

      console.log('✅ QR Code is valid (with or without subscriptionId)!');
      return {
        userId: parsed.userId,
        busId: parsed.busId,
        subscriptionId: parsed.subscriptionId, // May be undefined
        timestamp: parsed.timestamp,
        type: parsed.type
      };
      
    } catch (error) {
      console.error('❌ JSON Parse Error:', error);
      return null;
    }
  }

  /**
   * TEST function with your exact QR code data
   */
  static testWithYourData(): void {
    console.log('🧪 === TESTING WITH YOUR ACTUAL QR CODES ===');
    
    // Test with your actual QR codes from the database
    const testCodes = [
      // Active paid subscription
      `{"userId":"PpdiX6GJCYdGcJkNlCbwa9wKfBu2","busId":"ikeltEapJ8Am3GkAEj8u","subscriptionId":"sub_1751445104400_4d9mt910b","timestamp":1751445104400,"type":"bus_subscription"}`,
      
      // Pending subscription
      `{"userId":"PpdiX6GJCYdGcJkNlCbwa9wKfBu2","busId":"6cxS0mA0PNlLmGIOSqul","subscriptionId":"sub_1751810822584_s7itcsvs9","timestamp":1751810822584,"type":"bus_subscription"}`,
      
      // Test with quotes (as might come from camera)
      `"{"userId":"PpdiX6GJCYdGcJkNlCbwa9wKfBu2","busId":"ikeltEapJ8Am3GkAEj8u","subscriptionId":"sub_1751445104400_4d9mt910b","timestamp":1751445104400,"type":"bus_subscription"}"`,
      
      // Test with escaped quotes (as might come from some systems)
      `{\"userId\":\"PpdiX6GJCYdGcJkNlCbwa9wKfBu2\",\"busId\":\"ikeltEapJ8Am3GkAEj8u\",\"subscriptionId\":\"sub_1751445104400_4d9mt910b\",\"timestamp\":1751445104400,\"type\":\"bus_subscription\"}`
    ];
    
    testCodes.forEach((code, index) => {
      console.log(`\n🧪 Test ${index + 1}:`);
      console.log('🧪 Input:', code);
      const result = this.parseQRCode(code);
      console.log('🧪 Result:', result ? '✅ SUCCESS' : '❌ FAILED');
      if (result) {
        console.log('🧪 Parsed data:', result);
      }
      console.log('---');
    });
  }

  /**
   * ✅ COMPLETELY FIXED: Updated validation using ONLY currentRiders array
   */
  static async validateQRCodeAndGetRiderInfo(
    qrCodeString: string, 
    driverBusId?: string
  ): Promise<ScannedRiderInfo> {
    try {
      console.log('🔍 === STARTING QR VALIDATION ===');

      // Step 1: Parse QR code
      const qrData = this.parseQRCode(qrCodeString);
      if (!qrData) {
        return {
          isValid: false,
          scanResult: 'invalid_format',
          message: 'Invalid QR code format. Please ensure you have a valid bus subscription QR code.'
        };
      }

      console.log('✅ QR Data extracted:', qrData);

      // Step 2: Check bus ID match
      if (driverBusId && qrData.busId !== driverBusId) {
        console.log('⚠️ Bus ID mismatch - Expected:', driverBusId, 'Got:', qrData.busId);
        return {
          isValid: false,
          scanResult: 'bus_mismatch',
          message: `This QR code is for a different bus route. Please use the correct QR code for this bus.`
        };
      }

      // Step 3: Get rider information
      const riderInfo = await this.getRiderInfo(qrData.userId);
      if (!riderInfo.isValid || !riderInfo.rider) {
        return {
          isValid: false,
          scanResult: 'user_not_found',
          message: `Rider account not found. Please contact support.`
        };
      }

      console.log('✅ Rider found:', riderInfo.rider.name);

      // Step 4: ✅ NEW: Get subscription from bus currentRiders (single source of truth)
      const subscriptionInfo = await this.getSubscriptionFromCurrentRiders(qrData.userId, qrData.busId);
      
      // Step 5: Get bus information
      const busInfo = await this.getBusInfo(qrData.busId);

      // Step 6: ✅ HANDLE ALL CASES WITH SPECIFIC MESSAGES
      if (!subscriptionInfo.isValid || !subscriptionInfo.subscription) {
        return {
          isValid: false,
          rider: riderInfo.rider,
          bus: busInfo.bus,
          scanResult: 'subscription_not_found',
          message: `❌ This rider is not currently subscribed to this bus route.`
        };
      }

      const subscription = subscriptionInfo.subscription;
      console.log('✅ Subscription found:', subscription);
      
      // Step 7: ✅ CHECK SUBSCRIPTION STATUS (active/inactive)
      if (subscription.status !== 'active') {
        return {
          isValid: false,
          rider: riderInfo.rider,
          subscription: subscription,
          bus: busInfo.bus,
          scanResult: 'subscription_inactive',
          message: `❌ This subscription is ${subscription.status}. Please contact support.`
        };
      }

      // Step 8: ✅ CHECK PAYMENT STATUS WITH HELPFUL MESSAGES
      switch (subscription.paymentStatus) {
        case 'paid':
          return {
            isValid: true,
            rider: riderInfo.rider,
            subscription: subscription,
            bus: busInfo.bus,
            scanResult: 'valid',
            message: `✅ Valid ticket! ${riderInfo.rider.name} is authorized to board.`
          };

        case 'pending':
          return {
            isValid: false,
            rider: riderInfo.rider,
            subscription: subscription,
            bus: busInfo.bus,
            scanResult: 'payment_pending',
            message: `⏳ Payment is pending review. Please wait for admin confirmation before boarding.`
          };

        case 'unpaid':
          return {
            isValid: false,
            rider: riderInfo.rider,
            subscription: subscription,
            bus: busInfo.bus,
            scanResult: 'payment_pending',
            message: `💳 Payment required. Please complete payment to access the bus.`
          };

        default:
          return {
            isValid: false,
            rider: riderInfo.rider,
            subscription: subscription,
            bus: busInfo.bus,
            scanResult: 'payment_pending',
            message: `❓ Unknown payment status: ${subscription.paymentStatus}. Please contact support.`
          };
      }

    } catch (error) {
      console.error('❌ Validation error:', error);
      return {
        isValid: false,
        scanResult: 'invalid_format',
        message: `Error scanning QR code. Please try again or contact support.`
      };
    }
  }

  /**
   * Get rider information from database
   */
  private static async getRiderInfo(userId: string): Promise<{
    isValid: boolean;
    rider?: ScannedRiderInfo['rider'];
  }> {
    try {
      console.log('🔍 Fetching rider:', userId);
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error('❌ User document not found');
        return { isValid: false };
      }

      const userData = userDoc.data();
      console.log('✅ User found:', userData.name, userData.email);
      
      return {
        isValid: true,
        rider: {
          id: userId,
          name: userData.name || 'Unknown',
          email: userData.email || '',
          phoneNumber: userData.phoneNumber,
          address: userData.address,
          emergencyContact: userData.emergencyContact
        }
      };
    } catch (error) {
      console.error('❌ Error fetching rider:', error);
      return { isValid: false };
    }
  }

  /**
   * ✅ NEW: Get subscription info from bus currentRiders array (single source of truth)
   */
  private static async getSubscriptionFromCurrentRiders(
    userId: string, 
    busId: string
  ): Promise<{
    isValid: boolean;
    subscription?: ScannedRiderInfo['subscription'];
  }> {
    try {
      console.log('🔍 Looking for subscription in bus currentRiders:', { userId, busId });
      
      // ✅ NEW APPROACH: Get subscription data from bus currentRiders
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);

      if (!busDoc.exists()) {
        console.error('❌ Bus not found');
        return { isValid: false };
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      console.log('🔍 Found', currentRiders.length, 'current riders');
      
      // Find this user in currentRiders
      const riderData = currentRiders.find((rider: any) => rider.id === userId);
      
      if (!riderData) {
        console.log('❌ User not found in currentRiders');
        return { isValid: false };
      }

      console.log('✅ Found rider in currentRiders:', {
        name: riderData.name,
        status: riderData.status,
        paymentStatus: riderData.paymentStatus,
        subscriptionType: riderData.subscriptionType
      });

      return {
        isValid: true,
        subscription: {
          subscriptionId: riderData.subscriptionId,
          subscriptionType: riderData.subscriptionType,
          paymentStatus: riderData.paymentStatus,
          status: riderData.status,
          startDate: riderData.startDate || riderData.assignedAt,
          endDate: riderData.endDate,
          locationId: riderData.locationId
        }
      };
    } catch (error) {
      console.error('❌ Error fetching subscription from currentRiders:', error);
      return { isValid: false };
    }
  }

  /**
   * Get bus information
   */
  private static async getBusInfo(busId: string): Promise<{
    isValid: boolean;
    bus?: ScannedRiderInfo['bus'];
  }> {
    try {
      console.log('🔍 Fetching bus info...');
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);

      if (!busDoc.exists()) {
        console.error('❌ Bus not found for ID:', busId);
        return { isValid: false };
      }

      const busData = busDoc.data();
      console.log('✅ Bus data found:', busData);
      
      // Extract route information
      const route = (busData.locations || []).map((location: any) => ({
        name: location.name,
        arrivalTimeFrom: location.arrivalTimeFrom,
        arrivalTimeTo: location.arrivalTimeTo,
        order: location.order
      })).sort((a: any, b: any) => a.order - b.order);

      return {
        isValid: true,
        bus: {
          id: busId,
          busName: busData.busName || 'Unknown Bus',
          busLabel: busData.busLabel || '',
          route: route
        }
      };
    } catch (error) {
      console.error('❌ Error fetching bus info:', error);
      return { isValid: false };
    }
  }

  /**
   * Get formatted route display for a rider's subscription
   */
  static getFormattedRoute(riderInfo: ScannedRiderInfo): string {
    if (!riderInfo.bus?.route || !riderInfo.subscription?.locationId) {
      return 'Route information not available';
    }

    const subscribedLocation = riderInfo.subscription.locationId;
    const route = riderInfo.bus.route;

    // Handle array of locations
    let boardingLocation = subscribedLocation;
    if (Array.isArray(subscribedLocation)) {
      boardingLocation = subscribedLocation[0]; // Use first location
    }

    // Find rider's boarding location
    const boardingLocationIndex = route.findIndex(stop => 
      stop.name === boardingLocation
    );

    if (boardingLocationIndex === -1) {
      return `Subscribed to: ${boardingLocation}`;
    }

    const routeStops = route.map(stop => stop.name).join(' → ');
    return `Route: ${routeStops}\nBoarding at: ${boardingLocation}`;
  }

  /**
   * Get payment status display
   */
  static getPaymentStatusDisplay(paymentStatus: string): { 
    text: string; 
    color: 'success' | 'warning' | 'error' 
  } {
    switch (paymentStatus) {
      case 'paid':
        return { text: 'Paid ✓', color: 'success' };
      case 'pending':
        return { text: 'Payment Pending', color: 'warning' };
      case 'unpaid':
        return { text: 'Payment Required', color: 'error' };
      default:
        return { text: 'Unknown', color: 'error' };
    }
  }

  /**
   * Get subscription type display
   */
  static getSubscriptionTypeDisplay(subscriptionType: string): string {
    switch (subscriptionType) {
      case 'monthly':
        return 'Monthly Pass';
      case 'per_ride':
        return 'Per Ride';
      default:
        return subscriptionType;
    }
  }
} 