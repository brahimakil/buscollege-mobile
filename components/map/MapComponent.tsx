import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '../../themes/colors';

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
}

// Web Map Component using direct DOM manipulation
const WebMapComponent: React.FC<MapComponentProps> = ({ 
  routes = [],
  height = 300, 
  centerLat = 33.8547, 
  centerLng = 35.8623, 
  zoom = 9 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapId = `map-${Math.random().toString(36).substr(2, 9)}`;
  
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;

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
    
    // Create sample routes if no valid routes provided
    const sampleRoutes = validRoutes.length > 0 ? validRoutes : [
      {
        id: 'sample1',
        name: 'Beirut - Tripoli',
        locations: [
          { name: 'Beirut Central', latitude: 33.8938, longitude: 35.5018, order: 1 },
          { name: 'Jounieh', latitude: 33.9816, longitude: 35.6178, order: 2 },
          { name: 'Byblos', latitude: 34.1208, longitude: 35.6481, order: 3 },
          { name: 'Tripoli', latitude: 34.4332, longitude: 35.8498, order: 4 }
        ],
        color: '#6366F1'
      },
      {
        id: 'sample2',
        name: 'Beirut - Sidon',
        locations: [
          { name: 'Beirut Central', latitude: 33.8938, longitude: 35.5018, order: 1 },
          { name: 'Damour', latitude: 33.7089, longitude: 35.4897, order: 2 },
          { name: 'Sidon', latitude: 33.5631, longitude: 35.3708, order: 3 }
        ],
        color: '#EC4899'
      }
    ];

    // Create iframe for the map
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = `${height}px`;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    
    const mapHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
          }
          #${mapId} { 
            height: ${height}px; 
            width: 100%; 
          }
          .custom-popup {
            font-size: 14px;
            font-weight: 500;
          }
          .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #64748B;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div id="${mapId}">
          <div class="loading">Loading map...</div>
        </div>
        <script>
          setTimeout(function() {
            try {
              document.getElementById('${mapId}').innerHTML = '';
              
              var map = L.map('${mapId}').setView([${centerLat}, ${centerLng}], ${zoom});
              
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
              }).addTo(map);

              var allPoints = [];
              var routeData = ${JSON.stringify(sampleRoutes)};
              var defaultColors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];

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
                  
                  if (routePoints.length > 1) {
                    var polyline = L.polyline(routePoints, {
                      color: routeColor,
                      weight: 4,
                      opacity: 0.8,
                      smoothFactor: 1
                    }).addTo(map);
                  }
                  
                  routePoints.forEach(function(point, pointIndex) {
                    var marker = L.marker(point).addTo(map);
                    var locationName = validLocations[pointIndex] ? validLocations[pointIndex].name : 'Unknown';
                    marker.bindPopup('<div class="custom-popup"><strong>' + (route.name || 'Unknown Route') + '</strong><br/>' + locationName + '</div>');
                    allPoints.push(point);
                  });
                  
                  if (routePoints.length > 1) {
                    // Start marker
                    L.marker(routePoints[0], {
                      icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: '<div style="background-color: ' + routeColor + '; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">S</div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                      })
                    }).addTo(map).bindPopup('<div class="custom-popup"><strong>' + (route.name || 'Unknown Route') + '</strong><br/>Start Point</div>');
                    
                    // End marker
                    L.marker(routePoints[routePoints.length - 1], {
                      icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: '<div style="background-color: ' + routeColor + '; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">E</div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                      })
                    }).addTo(map).bindPopup('<div class="custom-popup"><strong>' + (route.name || 'Unknown Route') + '</strong><br/>End Point</div>');
                  }
                } catch (routeError) {
                  console.error('Error processing route:', route.name || 'Unknown', routeError);
                }
              });

              if (allPoints.length > 0) {
                try {
                  var group = new L.featureGroup(allPoints.map(function(p) { return L.marker(p); }));
                  map.fitBounds(group.getBounds().pad(0.1));
                } catch (boundsError) {
                  console.warn('Could not fit bounds, using default view');
                }
              }
              
            } catch (error) {
              console.error('Map initialization error:', error);
              document.getElementById('${mapId}').innerHTML = '<div class="loading">Map could not be loaded</div>';
            }
          }, 100);
        </script>
      </body>
      </html>
    `;

    iframe.srcdoc = mapHTML;
    mapRef.current.appendChild(iframe);

    return () => {
      if (mapRef.current && iframe.parentNode) {
        mapRef.current.removeChild(iframe);
      }
    };
  }, [routes, height, centerLat, centerLng, zoom, mapId]);

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

// Native Map Component (placeholder for mobile)
const NativeMapComponent: React.FC<MapComponentProps> = ({ routes = [], height = 300 }) => {
  // Add null check here too if there's any filtering logic
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.placeholderContainer}>
        <Ionicons name="map" size={48} color={AppColors.textTertiary} />
        <Text style={styles.placeholderText}>
          Map view available on web
        </Text>
        <Text style={styles.placeholderSubtext}>
          {(routes || []).length > 0 
            ? `Showing ${routes.length} route${routes.length !== 1 ? 's' : ''}`
            : 'No routes to display'
          }
        </Text>
      </View>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.light.border,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    color: AppColors.light.text,
    marginBottom: AppSpacing.xs,
  },
  placeholderSubtext: {
    fontSize: AppFontSizes.sm,
    color: AppColors.light.textSecondary,
    marginBottom: AppSpacing.md,
  },
}); 