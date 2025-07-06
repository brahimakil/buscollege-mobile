import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { db } from '../../config/firebase';
import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '../../themes/colors';

// Import WebView only for native platforms
let WebView: any;
if (Platform.OS !== 'web') {
  try {
    const { WebView: RNWebView } = require('react-native-webview');
    WebView = RNWebView;
  } catch (error) {
    console.warn('react-native-webview not available:', error);
  }
}

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  order: number;
}

interface BusRoute {
  id: string;
  name: string;
  locations: Location[];
  color?: string;
}

interface MapComponentProps {
  routes?: BusRoute[];
  height?: number;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  showRealTimeData?: boolean;
}

// Hook to fetch bus routes from Firebase
const useBusRoutes = (showRealTimeData: boolean = true) => {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showRealTimeData) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    const fetchBusRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🗺️ Fetching bus routes from Firebase...');
        
        const busesRef = collection(db, 'buses');
        const querySnapshot = await getDocs(busesRef);
        
        const fetchedRoutes: BusRoute[] = [];
        const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#FF6B6B', '#4ECDC4'];
        
        querySnapshot.forEach((doc, index) => {
          const data = doc.data();
          
          // Validate and transform bus data to BusRoute format
          if (data && data.locations && Array.isArray(data.locations)) {
            const validLocations = data.locations
              .filter((loc: any) => 
                loc && 
                typeof loc.latitude === 'number' && 
                typeof loc.longitude === 'number' &&
                !isNaN(loc.latitude) && 
                !isNaN(loc.longitude)
              )
              .map((loc: any) => ({
                name: loc.name || 'Unknown Location',
                latitude: loc.latitude,
                longitude: loc.longitude,
                order: loc.order || 0
              }));
            
            if (validLocations.length > 0) {
              fetchedRoutes.push({
                id: doc.id,
                name: data.busName || data.busLabel || 'Unknown Bus',
                locations: validLocations,
                color: colors[index % colors.length]
              });
            }
          }
        });
        
        console.log(`✅ Successfully fetched ${fetchedRoutes.length} bus routes`);
        setRoutes(fetchedRoutes);
        
      } catch (err) {
        console.error('❌ Error fetching bus routes:', err);
        setError('Failed to load bus routes');
      } finally {
        setLoading(false);
      }
    };

    fetchBusRoutes();
  }, [showRealTimeData]);

  return { routes, loading, error };
};

// Shared function to generate map HTML (used by both web and mobile)
const generateMapHTML = (
  routes: BusRoute[], 
  height: number, 
  centerLat: number, 
  centerLng: number, 
  zoom: number,
  mapId: string
): string => {
  const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];
  
  // Filter and validate routes
  const validRoutes = (routes || [])
    .filter(route => route && route.locations && Array.isArray(route.locations))
    .map((route, index) => ({
      ...route,
      color: route.color || colors[index % colors.length],
      locations: (route.locations || []).filter(loc => 
        loc && 
        typeof loc.latitude === 'number' && 
        typeof loc.longitude === 'number' &&
        !isNaN(loc.latitude) && 
        !isNaN(loc.longitude)
      )
    }))
    .filter(route => route.locations.length > 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          overflow: hidden;
        }
        #${mapId} { 
          height: 100vh;
          width: 100vw;
        }
        .custom-popup {
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          max-width: 200px;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748B;
          font-size: 14px;
          flex-direction: column;
        }
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #6366F1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 8px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        /* Mobile-friendly popup styles */
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 8px 12px;
          line-height: 1.4;
        }
        /* Touch-friendly controls */
        .leaflet-control-zoom a {
          width: 36px;
          height: 36px;
          line-height: 36px;
          font-size: 18px;
        }
        .no-data {
          text-align: center;
          padding: 20px;
          color: #64748B;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div id="${mapId}">
        <div class="loading">
          <div class="loading-spinner"></div>
          <div>Loading South Lebanon Map...</div>
        </div>
      </div>
      <script>
        setTimeout(function() {
          try {
            document.getElementById('${mapId}').innerHTML = '';
            
            // Initialize map centered on South Lebanon
            var map = L.map('${mapId}', {
              center: [${centerLat}, ${centerLng}],
              zoom: ${zoom},
              zoomControl: true,
              attributionControl: true,
              scrollWheelZoom: true,
              doubleClickZoom: true,
              touchZoom: true,
              dragging: true
            });
            
            // Add OpenStreetMap tiles (completely free!)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
              minZoom: 3
            }).addTo(map);

            var allPoints = [];
            var routeData = ${JSON.stringify(validRoutes)};
            var defaultColors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];

            // Handle case when no routes are available
            if (!routeData || routeData.length === 0) {
              var noDataDiv = document.createElement('div');
              noDataDiv.className = 'no-data';
              noDataDiv.innerHTML = '<div style="margin-top: 40px;"><strong>🚌 No Bus Routes Available</strong><br><br>Bus routes will appear here once drivers add their routes.</div>';
              document.getElementById('${mapId}').appendChild(noDataDiv);
              return;
            }

            routeData.forEach(function(route, routeIndex) {
              try {
                if (!route || !route.locations || !Array.isArray(route.locations)) {
                  console.warn('Invalid route data:', route);
                  return;
                }

                var routeColor = route.color || defaultColors[routeIndex % defaultColors.length];
                var validLocations = route.locations.filter(function(loc) {
                  return loc && 
                         typeof loc.latitude === 'number' && 
                         typeof loc.longitude === 'number' &&
                         !isNaN(loc.latitude) && 
                         !isNaN(loc.longitude);
                });

                if (validLocations.length === 0) {
                  console.warn('No valid locations for route:', route.name);
                  return;
                }

                var routePoints = validLocations
                  .sort(function(a, b) { return (a.order || 0) - (b.order || 0); })
                  .map(function(loc) { return [loc.latitude, loc.longitude]; });
                
                // Draw route polyline
                if (routePoints.length > 1) {
                  var polyline = L.polyline(routePoints, {
                    color: routeColor,
                    weight: 4,
                    opacity: 0.8,
                    smoothFactor: 1
                  }).addTo(map);
                }
                
                // Add regular markers for each location
                routePoints.forEach(function(point, pointIndex) {
                  var marker = L.marker(point).addTo(map);
                  var locationName = validLocations[pointIndex] ? validLocations[pointIndex].name : 'Unknown';
                  var arrivalTime = validLocations[pointIndex] && validLocations[pointIndex].arrivalTimeFrom ? 
                    '<br><small>📅 ' + validLocations[pointIndex].arrivalTimeFrom + ' - ' + (validLocations[pointIndex].arrivalTimeTo || '') + '</small>' : '';
                  
                  marker.bindPopup('<div class="custom-popup"><strong>' + (route.name || 'Unknown Route') + '</strong><br/>📍 ' + locationName + arrivalTime + '</div>');
                  allPoints.push(point);
                });
                
                // Add special start and end markers
                if (routePoints.length > 1) {
                  // Start marker (green)
                  L.marker(routePoints[0], {
                    icon: L.divIcon({
                      className: 'custom-div-icon',
                      html: '<div style="background-color: #10B981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🚌</div>',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })
                  }).addTo(map).bindPopup('<div class="custom-popup"><strong>' + (route.name || 'Unknown Route') + '</strong><br/>🚀 Start: ' + (validLocations[0] ? validLocations[0].name : 'Unknown') + '</div>');
                  
                  // End marker (red)
                  L.marker(routePoints[routePoints.length - 1], {
                    icon: L.divIcon({
                      className: 'custom-div-icon',
                      html: '<div style="background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🏁</div>',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })
                  }).addTo(map).bindPopup('<div class="custom-popup"><strong>' + (route.name || 'Unknown Route') + '</strong><br/>🏁 End: ' + (validLocations[validLocations.length - 1] ? validLocations[validLocations.length - 1].name : 'Unknown') + '</div>');
                }
              } catch (routeError) {
                console.error('Error processing route:', route.name || 'Unknown', routeError);
              }
            });

            // Fit map bounds to show all routes, or use default South Lebanon view
            if (allPoints.length > 0) {
              try {
                var group = new L.featureGroup(allPoints.map(function(p) { return L.marker(p); }));
                map.fitBounds(group.getBounds().pad(0.1));
              } catch (boundsError) {
                console.warn('Could not fit bounds, using default view');
              }
            }
            
            // Add a subtle attribution
            map.attributionControl.setPrefix('🗺️ Free OpenStreetMap - South Lebanon');
            
          } catch (error) {
            console.error('Map initialization error:', error);
            document.getElementById('${mapId}').innerHTML = '<div class="loading"><div>❌ Map could not be loaded</div><div style="font-size: 12px; color: #64748B; margin-top: 8px;">Please check your internet connection</div></div>';
          }
        }, 100);
      </script>
    </body>
    </html>
  `;
};

// Web Map Component
const WebMapComponent: React.FC<MapComponentProps> = ({ 
  routes = [],
  height = 300, 
  centerLat = 33.4, // South Lebanon latitude
  centerLng = 35.4, // South Lebanon longitude
  zoom = 10,
  showRealTimeData = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapId = `map-${Math.random().toString(36).substr(2, 9)}`;
  const { routes: fetchedRoutes, loading, error } = useBusRoutes(showRealTimeData);
  
  const finalRoutes = showRealTimeData ? fetchedRoutes : routes;
  
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;

    // Create iframe for the map
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = `${height}px`;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    
    const mapHTML = generateMapHTML(finalRoutes, height, centerLat, centerLng, zoom, mapId);
    iframe.srcdoc = mapHTML;
    mapRef.current.appendChild(iframe);

    return () => {
      if (mapRef.current && iframe.parentNode) {
        mapRef.current.removeChild(iframe);
      }
    };
  }, [finalRoutes, height, centerLat, centerLng, zoom, mapId]);

  if (loading && showRealTimeData) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 8 }}>
        <div style={{ textAlign: 'center', color: '#64748B' }}>
          <div>🗺️ Loading South Lebanon routes...</div>
        </div>
      </div>
    );
  }

  if (error && showRealTimeData) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 8 }}>
        <div style={{ textAlign: 'center', color: '#EF4444' }}>
          <div>❌ {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef}
      style={{ 
        height: height, 
        borderRadius: 8, 
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}
    />
  );
};

// Native Map Component using WebView with OpenStreetMap
const NativeMapComponent: React.FC<MapComponentProps> = ({ 
  routes = [], 
  height = 300, 
  centerLat = 33.4, // South Lebanon latitude
  centerLng = 35.4, // South Lebanon longitude
  zoom = 10,
  showRealTimeData = true
}) => {
  const { routes: fetchedRoutes, loading, error } = useBusRoutes(showRealTimeData);
  const finalRoutes = showRealTimeData ? fetchedRoutes : routes;
  
  // Check if WebView is available
  if (!WebView) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="map" size={48} color={AppColors.light.textTertiary} />
          <Text style={styles.placeholderText}>
            Maps not available
          </Text>
          <Text style={styles.placeholderSubtext}>
            Install react-native-webview to view maps on mobile
          </Text>
        </View>
      </View>
    );
  }

  if (loading && showRealTimeData) {
    return (
      <View style={[styles.loadingContainer, { height }]}>
        <Ionicons name="map" size={32} color={AppColors.light.primary} />
        <Text style={styles.loadingText}>Loading South Lebanon routes...</Text>
      </View>
    );
  }

  if (error && showRealTimeData) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="warning" size={48} color={AppColors.light.error} />
          <Text style={[styles.placeholderText, { color: AppColors.light.error }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  const mapId = `mobile-map-${Math.random().toString(36).substr(2, 9)}`;
  const mapHTML = generateMapHTML(finalRoutes, height, centerLat, centerLng, zoom, mapId);

  return (
    <View style={[styles.mapContainer, { height }]}>
      <WebView
        source={{ html: mapHTML }}
        style={[styles.webview, { height }]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        scrollEnabled={false}
        bounces={false}
        renderLoading={() => (
          <View style={[styles.loadingContainer, { height }]}>
            <Ionicons name="map" size={32} color={AppColors.light.primary} />
            <Text style={styles.loadingText}>Loading South Lebanon Map...</Text>
          </View>
        )}
        onError={(error) => {
          console.error('WebView error:', error);
        }}
        onLoadEnd={() => {
          console.log('✅ OpenStreetMap loaded successfully on mobile - South Lebanon');
        }}
      />
    </View>
  );
};

export const MapComponent: React.FC<MapComponentProps> = (props) => {
  return Platform.OS === 'web' ? (
    <WebMapComponent {...props} />
  ) : (
    <NativeMapComponent {...props} />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.light.surface,
    borderRadius: AppBorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.light.border,
  },
  mapContainer: {
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.light.border,
    backgroundColor: AppColors.light.surface,
  },
  webview: {
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.light.surface,
  },
  loadingText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.light.textSecondary,
    marginTop: AppSpacing.sm,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    color: AppColors.light.text,
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.xs,
  },
  placeholderSubtext: {
    fontSize: AppFontSizes.sm,
    color: AppColors.light.textSecondary,
    textAlign: 'center',
  },
}); 