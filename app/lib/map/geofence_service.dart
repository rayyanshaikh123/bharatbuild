import 'package:geolocator/geolocator.dart';

class GeofenceService {
  /// sitePolygon: list of [lat, lng]
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
}
