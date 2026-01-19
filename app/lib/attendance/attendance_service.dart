import 'package:geolocator/geolocator.dart';
import '../map/geofence_service.dart';

class AttendanceService {
  final GeofenceService _geofence = GeofenceService();

  /// Validates check-in conditions.
  Future<bool> canCheckIn(
    Position pos,
    List<List<double>> sitePolygon, {
    double maxAccuracy = 20.0,
  }) async {
    if (pos.accuracy.isFinite && pos.accuracy > maxAccuracy) return false;
    if (await _isMock(pos)) return false;
    final inside = _geofence.isPointInside([
      pos.latitude,
      pos.longitude,
    ], sitePolygon);
    return inside;
  }

  Future<bool> _isMock(Position pos) async {
    try {
      return pos.isMocked ?? false;
    } catch (_) {
      return false;
    }
  }
}
