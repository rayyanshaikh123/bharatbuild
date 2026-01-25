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

  /// Robustly converts various JSON coordinate formats to [lat, lng]
  static List<double>? _parsePoint(dynamic p) {
    if (p == null) return null;
    double? lat, lng;

    if (p is List && p.length >= 2) {
      double c1 = _safeParseDouble(p[0]);
      double c2 = _safeParseDouble(p[1]);
      
      // India-specific heuristic: Lat is usually 8-38, Lng is 68-98
      if (c1 > 50.0 && c2 < 45.0) {
        lat = c2;
        lng = c1;
      } else {
        lat = c1;
        lng = c2;
      }
    } else if (p is Map) {
      lat = _safeParseDouble(p['lat'] ?? p['latitude'] ?? p['y']);
      lng = _safeParseDouble(p['lng'] ?? p['longitude'] ?? p['x']);
    }

    if (lat != null && lng != null) {
      return [lat!, lng!];
    }
    return null;
  }

  /// Safely parse any dynamic value to a double
  static double _safeParseDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? 0.0;
    return 0.0;
  }

  factory GeofenceData.fromJson(Map<String, dynamic> json) {
    // 1. Handle GeoJSON format
    if (json.containsKey('type') && (json['type'] == 'Feature' || json['type'] == 'Polygon')) {
      final Map<String, dynamic>? geometry = json['type'] == 'Polygon' ? json : json['geometry'] as Map<String, dynamic>?;
      if (geometry != null && geometry['type'] == 'Polygon') {
        final coords = geometry['coordinates'] as List?;
        if (coords != null && coords.isNotEmpty) {
          final outerRing = coords[0] as List;
          final polygon = outerRing.map((c) {
            if (c is List && c.length >= 2) {
              return [_safeParseDouble(c[1]), _safeParseDouble(c[0])]; // GeoJSON [lng, lat]
            }
            return null;
          }).whereType<List<double>>().toList();
          
          if (polygon.isNotEmpty) {
            return GeofenceData(type: 'POLYGON', polygon: polygon);
          }
        }
      }
    }

    // 2. Handle Simple CIRCLE/POLYGON type
    final type = (json['type'] as String? ?? 'NONE').toUpperCase();
    if (type == 'CIRCLE') {
      final center = json['center'] as Map<String, dynamic>?;
      final radius = _safeParseDouble(json['radius_meters'] ?? json['radius']);
      return GeofenceData(
        type: type,
        center: center,
        radiusMeters: radius,
      );
    } else if (type == 'POLYGON') {
      final rawPolygon = (json['polygon'] ?? json['coordinates']) as List?;
      final polygon = rawPolygon?.map(_parsePoint).whereType<List<double>>().toList();
      return GeofenceData(
        type: type,
        polygon: (polygon?.isNotEmpty == true) ? polygon : null,
      );
    }

    return GeofenceData(type: 'NONE');
  }
}

class GeofenceService {
  /// Safety numeric rounding
  int _safeRound(double value) {
    if (value.isInfinite || value.isNaN) return 999999;
    return value.round();
  }

  /// Instance version of safe parse
  double _parseVal(dynamic v) => GeofenceData._safeParseDouble(v);

  /// Check if point is inside CIRCLE geofence
  bool isPointInsideCircle(
    double pointLat,
    double pointLng,
    double centerLat,
    double centerLng,
    double radiusMeters,
  ) {
    final distance = Geolocator.distanceBetween(pointLat, pointLng, centerLat, centerLng);
    return distance <= radiusMeters;
  }

  /// Check if point is inside geofence (supports CIRCLE and POLYGON)
  bool isPointInsideGeofence(
    double pointLat,
    double pointLng,
    GeofenceData geofence,
  ) {
    final double graceBuffer = 30.0;
    if (geofence.type == 'CIRCLE') {
      if (geofence.center == null || geofence.radiusMeters == null) return false;
      final cLat = _parseVal(geofence.center!['lat'] ?? geofence.center!['latitude']);
      final cLng = _parseVal(geofence.center!['lng'] ?? geofence.center!['longitude']);
      
      final distance = Geolocator.distanceBetween(pointLat, pointLng, cLat, cLng);
      return distance <= geofence.radiusMeters! + graceBuffer;
    } else if (geofence.type == 'POLYGON' && geofence.polygon != null) {
      final dist = _distanceToPolygon(pointLat, pointLng, geofence.polygon!);
      return dist <= graceBuffer;
    }
    return true;
  }

  /// Validate geofence from backend project data
  Map<String, dynamic> validateGeofence(
    double pointLat,
    double pointLng,
    Map<String, dynamic>? projectData,
  ) {
    final geofenceJson = projectData?['geofence'];
    final double graceBuffer = 30.0;

    // A. Priority: Shape-based validation (JSONB)
    if (geofenceJson != null && geofenceJson is Map<String, dynamic>) {
      final geofence = GeofenceData.fromJson(geofenceJson);
      if (geofence.type != 'NONE') {
        if (geofence.type == 'POLYGON' && geofence.polygon != null) {
           final distance = _distanceToPolygon(pointLat, pointLng, geofence.polygon!);
           return {
             'isValid': distance <= graceBuffer,
             'distance': _safeRound(distance),
             'allowedRadius': 0,
             'source': 'geofence_shape_polygon',
             'geofenceType': 'POLYGON',
           };
        } else if (geofence.type == 'CIRCLE') {
           final cLat = _parseVal(geofence.center?['lat'] ?? geofence.center?['latitude']);
           final cLng = _parseVal(geofence.center?['lng'] ?? geofence.center?['longitude']);
           final radius = geofence.radiusMeters;
           
           if ((cLat != 0.0 || cLng != 0.0) && radius != null) {
             final dist = Geolocator.distanceBetween(pointLat, pointLng, cLat, cLng);
             return {
               'isValid': dist <= radius + graceBuffer,
               'distance': _safeRound(dist - radius),
               'allowedRadius': _safeRound(radius),
               'source': 'geofence_shape_circle',
               'geofenceType': 'CIRCLE',
             };
           }
        }
      }
    }

    // B. Fallback: Column-based validation (Safely parse Strings)
    final rawLat = projectData?['latitude'];
    final rawLng = projectData?['longitude'];
    final rawRad = projectData?['geofence_radius'];

    if (rawLat != null && rawLng != null) {
      final double projLat = _parseVal(rawLat);
      final double projLng = _parseVal(rawLng);
      final double radius = rawRad != null ? _parseVal(rawRad) : 200.0;
      
      final distance = Geolocator.distanceBetween(pointLat, pointLng, projLat, projLng);
      return {
        'isValid': distance <= radius + graceBuffer,
        'distance': _safeRound(distance),
        'allowedRadius': _safeRound(radius),
        'source': 'geofence_legacy',
        'geofenceType': 'CIRCLE',
      };
    }

    return {
      'isValid': true,
      'distance': 0,
      'allowedRadius': 0,
      'message': 'No location constraints',
      'source': 'none',
      'geofenceType': 'NONE',
    };
  }

  /// Ray-casting algorithm for point-in-polygon
  bool isPointInside(List<double> point, List<List<double>> sitePolygon) {
    if (sitePolygon.length < 3) return false;
    final double x = point[1]; // longitude
    final double y = point[0]; // latitude
    bool inside = false;
    for (int i = 0, j = sitePolygon.length - 1; i < sitePolygon.length; j = i++) {
      final xi = sitePolygon[i][1], yi = sitePolygon[i][0];
      final xj = sitePolygon[j][1], yj = sitePolygon[j][0];
      final intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /// Accurate distance from point to polygon (negative if inside)
  double _distanceToPolygon(double pointLat, double pointLng, List<List<double>> polygon) {
    if (polygon.isEmpty) return double.infinity;
    if (isPointInside([pointLat, pointLng], polygon)) return -1.0;
    
    double min = double.infinity;
    for (final p in polygon) {
      final d = Geolocator.distanceBetween(pointLat, pointLng, p[0], p[1]);
      if (d < min) min = d;
    }
    return min;
  }
}
