import 'package:geolocator/geolocator.dart';

/// Geofence data structure from backend
class GeofenceData {
  final String type; // 'CIRCLE' or 'POLYGON'
  final Map<String, dynamic>? center; // {lat: double, lng: double} for CIRCLE
  final double? radiusMeters; // for CIRCLE
  final List<List<double>>? polygon; // for POLYGON

  GeofenceData({
    required this.type,
    this.center,
    this.radiusMeters,
    this.polygon,
  });

  factory GeofenceData.fromJson(Map<String, dynamic> json) {
    // Handle GeoJSON format (from web frontend)
    if (json.containsKey('type') && json['type'] == 'Feature') {
      // GeoJSON Feature
      final geometry = json['geometry'] as Map<String, dynamic>?;
      if (geometry != null) {
        final geomType = geometry['type'] as String?;
        final coordinates = geometry['coordinates'] as dynamic;
        
        if (geomType == 'Polygon' && coordinates is List) {
          // GeoJSON Polygon - coordinates is array of rings, first ring is outer boundary
          final outerRing = coordinates[0] as List;
          final polygon = outerRing.map((coord) {
            if (coord is List && coord.length >= 2) {
              return [coord[1].toDouble(), coord[0].toDouble()]; // GeoJSON is [lng, lat], we need [lat, lng]
            }
            return null;
          }).whereType<List<double>>().toList();
          
          return GeofenceData(
            type: 'POLYGON',
            polygon: polygon.map((p) => [p[0], p[1]]).toList().cast<List<double>>(),
          );
        } else if (geomType == 'Circle' || geomType == 'Point') {
          // Try to extract circle from properties or calculate from bounds
          final properties = json['properties'] as Map<String, dynamic>?;
          if (properties != null && properties.containsKey('radius')) {
            final center = coordinates is List && coordinates.length >= 2
                ? {'lat': coordinates[1].toDouble(), 'lng': coordinates[0].toDouble()}
                : null;
            final radius = (properties['radius'] as num?)?.toDouble();
            if (center != null && radius != null) {
              return GeofenceData(
                type: 'CIRCLE',
                center: center,
                radiusMeters: radius,
              );
            }
          }
        }
      }
    }
    
    // Handle simple CIRCLE type
    final type = json['type'] as String? ?? 'NONE';
    
    if (type == 'CIRCLE') {
      final center = json['center'] as Map<String, dynamic>?;
      final radiusMeters = json['radius_meters'] as num?;
      return GeofenceData(
        type: type,
        center: center,
        radiusMeters: radiusMeters?.toDouble(),
      );
    } else if (type == 'POLYGON') {
      final polygon = json['polygon'] as List?;
      return GeofenceData(
        type: type,
        polygon: polygon?.map((p) => [
          (p[0] as num).toDouble(),
          (p[1] as num).toDouble(),
        ]).toList().cast<List<double>>(),
      );
    }
    
    return GeofenceData(type: 'NONE');
  }
}

class GeofenceService {
  /// Check if point is inside CIRCLE geofence
  bool isPointInsideCircle(
    double pointLat,
    double pointLng,
    double centerLat,
    double centerLng,
    double radiusMeters,
  ) {
    final distance = Geolocator.distanceBetween(
      pointLat,
      pointLng,
      centerLat,
      centerLng,
    );
    return distance <= radiusMeters;
  }

  /// Check if point is inside geofence (supports CIRCLE and POLYGON)
  bool isPointInsideGeofence(
    double pointLat,
    double pointLng,
    GeofenceData geofence,
  ) {
    if (geofence.type == 'CIRCLE') {
      if (geofence.center == null || geofence.radiusMeters == null) {
        return false;
      }
      final centerLat = (geofence.center!['lat'] as num?)?.toDouble();
      final centerLng = (geofence.center!['lng'] as num?)?.toDouble();
      if (centerLat == null || centerLng == null) {
        return false;
      }
      return isPointInsideCircle(
        pointLat,
        pointLng,
        centerLat,
        centerLng,
        geofence.radiusMeters!,
      );
    } else if (geofence.type == 'POLYGON' && geofence.polygon != null) {
      return isPointInside([pointLat, pointLng], geofence.polygon!);
    }
    // NONE type - no restriction
    return true;
  }

  /// Calculate distance from point to geofence center (for CIRCLE) or nearest edge (for POLYGON)
  double distanceToGeofence(
    double pointLat,
    double pointLng,
    GeofenceData geofence,
  ) {
    if (geofence.type == 'CIRCLE') {
      if (geofence.center == null) return double.infinity;
      final centerLat = (geofence.center!['lat'] as num?)?.toDouble();
      final centerLng = (geofence.center!['lng'] as num?)?.toDouble();
      if (centerLat == null || centerLng == null) return double.infinity;
      
      final distance = Geolocator.distanceBetween(
        pointLat,
        pointLng,
        centerLat,
        centerLng,
      );
      // Return distance minus radius to get distance from edge
      if (geofence.radiusMeters != null) {
        return distance - geofence.radiusMeters!;
      }
      return distance;
    } else if (geofence.type == 'POLYGON' && geofence.polygon != null) {
      // Calculate distance to nearest polygon vertex
      double min = double.infinity;
      for (final p in geofence.polygon!) {
        final d = Geolocator.distanceBetween(pointLat, pointLng, p[0], p[1]);
        if (d < min) min = d;
      }
      return min == double.infinity ? 0.0 : min;
    }
    return 0.0;
  }

  /// Validate geofence from backend project data
  /// Returns validation result similar to backend format
  Map<String, dynamic> validateGeofence(
    double pointLat,
    double pointLng,
    Map<String, dynamic>? projectData,
  ) {
    // Check for geofence JSONB field (supports GeoJSON and CIRCLE types)
    final geofenceJson = projectData?['geofence'];
    if (geofenceJson != null && geofenceJson is Map) {
      // Handle GeoJSON Feature format
      if (geofenceJson['type'] == 'Feature') {
        final geometry = geofenceJson['geometry'] as Map<String, dynamic>?;
        if (geometry != null) {
          final geomType = geometry['type'] as String?;
          final coordinates = geometry['coordinates'] as dynamic;
          
          if (geomType == 'Polygon' && coordinates is List) {
            // GeoJSON Polygon validation
            final outerRing = coordinates[0] as List;
            final polygon = outerRing.map((coord) {
              if (coord is List && coord.length >= 2) {
                return [coord[1].toDouble(), coord[0].toDouble()]; // GeoJSON is [lng, lat], convert to [lat, lng]
              }
              return null;
            }).whereType<List<double>>().toList();
            
            if (polygon.isNotEmpty) {
              final isValid = isPointInside([pointLat, pointLng], polygon);
              final distance = _distanceToPolygon(pointLat, pointLng, polygon);
              return {
                'isValid': isValid,
                'distance': distance.abs().round(),
                'allowedRadius': 0,
                'source': 'geofence_geojson',
                'geofenceType': 'POLYGON',
              };
            }
          } else if (geomType == 'Circle' || geomType == 'Point') {
            // Extract circle from properties
            final properties = geofenceJson['properties'] as Map<String, dynamic>?;
            if (properties != null && properties.containsKey('radius')) {
              final centerLat = coordinates is List && coordinates.length >= 2
                  ? coordinates[1].toDouble()
                  : null;
              final centerLng = coordinates is List && coordinates.length >= 2
                  ? coordinates[0].toDouble()
                  : null;
              final radius = (properties['radius'] as num?)?.toDouble();
              
              if (centerLat != null && centerLng != null && radius != null) {
                final isValid = isPointInsideCircle(pointLat, pointLng, centerLat, centerLng, radius);
                final distance = Geolocator.distanceBetween(pointLat, pointLng, centerLat, centerLng) - radius;
                return {
                  'isValid': isValid,
                  'distance': distance.round(),
                  'allowedRadius': radius.round(),
                  'source': 'geofence_geojson',
                  'geofenceType': 'CIRCLE',
                };
              }
            }
          }
        }
      }
      
      // Handle simple CIRCLE type
      final geofence = GeofenceData.fromJson(geofenceJson as Map<String, dynamic>);
      if (geofence.type != 'NONE') {
        final isValid = isPointInsideGeofence(pointLat, pointLng, geofence);
        final distance = distanceToGeofence(pointLat, pointLng, geofence);
        return {
          'isValid': isValid,
          'distance': distance.round(),
          'allowedRadius': geofence.radiusMeters?.round() ?? 0,
          'source': 'geofence_jsonb',
          'geofenceType': geofence.type,
        };
      }
    }

    // Fallback to legacy fields
    final projLat = projectData?['latitude'] as num?;
    final projLng = projectData?['longitude'] as num?;
    final geofenceRadius = projectData?['geofence_radius'] as num?;

    if (projLat != null && projLng != null && geofenceRadius != null) {
      final distance = Geolocator.distanceBetween(
        pointLat,
        pointLng,
        projLat.toDouble(),
        projLng.toDouble(),
      );
      return {
        'isValid': distance <= geofenceRadius.toDouble(),
        'distance': distance.round(),
        'allowedRadius': geofenceRadius.toInt(),
        'source': 'legacy_fields',
        'geofenceType': 'CIRCLE',
      };
    }

    // No geofence restriction
    return {
      'isValid': true,
      'distance': 0,
      'allowedRadius': 0,
      'message': 'No geofence restriction',
      'source': 'none',
      'geofenceType': 'NONE',
    };
  }

  /// sitePolygon: list of [lat, lng] - Legacy method for polygon validation
  bool isPointInside(List<double> point, List<List<double>> sitePolygon) {
    // Ray-casting algorithm for point-in-polygon
    final double x = point[1]; // longitude
    final double y = point[0]; // latitude
    bool inside = false;
    for (
      int i = 0, j = sitePolygon.length - 1;
      i < sitePolygon.length;
      j = i++
    ) {
      final xi = sitePolygon[i][1];
      final yi = sitePolygon[i][0];
      final xj = sitePolygon[j][1];
      final yj = sitePolygon[j][0];

      final intersect =
          ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /// Calculate distance in meters from point to nearest polygon vertex (approx).
  Future<double> distanceToSite(
    List<double> point,
    List<List<double>> sitePolygon,
  ) async {
    final lat = point[0];
    final lng = point[1];
    double min = double.infinity;
    for (final p in sitePolygon) {
      final d = Geolocator.distanceBetween(lat, lng, p[0], p[1]);
      if (d < min) min = d;
    }
    return min == double.infinity ? 0.0 : min;
  }

  /// Calculate distance from point to polygon edge (negative if inside)
  double _distanceToPolygon(double pointLat, double pointLng, List<List<double>> polygon) {
    final isInside = isPointInside([pointLat, pointLng], polygon);
    if (isInside) {
      // Calculate distance to nearest edge
      double minDist = double.infinity;
      for (int i = 0; i < polygon.length; i++) {
        final p1 = polygon[i];
        final p2 = polygon[(i + 1) % polygon.length];
        // Distance to line segment (simplified - distance to midpoint)
        final midLat = (p1[0] + p2[0]) / 2;
        final midLng = (p1[1] + p2[1]) / 2;
        final dist = Geolocator.distanceBetween(pointLat, pointLng, midLat, midLng);
        if (dist < minDist) minDist = dist;
      }
      return -minDist; // Negative means inside
    } else {
      // Calculate distance to nearest vertex
      double minDist = double.infinity;
      for (final p in polygon) {
        final dist = Geolocator.distanceBetween(pointLat, pointLng, p[0], p[1]);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    }
  }
}
