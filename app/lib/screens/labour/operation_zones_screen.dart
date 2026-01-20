import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'labour_dashboard_detail.dart';
import '../../providers/user_provider.dart';
import 'dart:math' show sin, cos, sqrt, atan2, pi;

class OperationZonesScreen extends ConsumerWidget {
  const OperationZonesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Mock nearby sites list moved into this widget — acts as home content
    // Each site has a latitude/longitude so we can compute distance from user.
    final ongoingSites = [
      {
        'id': 10,
        'name': 'METRO TOWER',
        'address': 'Metro Tower',
        'lat': 19.0450,
        'lng': 72.8200,
        'status': 'Ongoing',
      },
    ];

    final sites = [
      {
        'id': 1,
        'name': 'ZONE 4, MUMBAI',
        'address': 'Zone 4',
        'lat': 19.0760,
        'lng': 72.8777,
      },
      {
        'id': 2,
        'name': 'COASTAL ROAD',
        'address': 'Coastal Rd',
        'lat': 18.9696,
        'lng': 72.8225,
      },
      {
        'id': 3,
        'name': 'HITECH CITY',
        'address': 'Hitech',
        'lat': 17.4459,
        'lng': 78.3499,
      },
    ];

    final user = ref.watch(currentUserProvider);
    // Try to parse latitude/longitude from user profile if present.
    final double? userLat = _toDouble(user?['primary_latitude']);
    final double? userLng = _toDouble(user?['primary_longitude']);

    String distanceLabelForSite(Map<String, Object?> site) {
      final siteLat = _toDouble(site['lat']);
      final siteLng = _toDouble(site['lng']);
      if (userLat == null ||
          userLng == null ||
          siteLat == null ||
          siteLng == null) {
        return '-';
      }
      final meters = _haversineDistanceMeters(
        userLat,
        userLng,
        siteLat,
        siteLng,
      );
      if (meters < 1000) {
        return '${meters.toStringAsFixed(0)} m';
      }
      return '${(meters / 1000).toStringAsFixed(1)} km';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Map preview header area
        Container(
          height: 160,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8),
            ],
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.map, size: 48, color: Color(0xFF00BF6D)),
                SizedBox(height: 8),
                Text(
                  'Site map',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 6),
                Text(
                  'Showing available operation zones',
                  style: TextStyle(color: Colors.black54),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Ongoing sites section
        if (ongoingSites.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 0.0),
            child: Text(
              'ONGOING SITES',
              style: TextStyle(
                color: Colors.black54,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Column(
            children: ongoingSites.map((s) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const LabourDashboardDetail(),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 20,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            s['name'] as String,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFFDF5),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.green.withOpacity(0.2),
                            ),
                          ),
                          child: Row(
                            children: const [
                              Icon(Icons.circle, size: 8, color: Colors.green),
                              SizedBox(width: 6),
                              Text(
                                'Ongoing',
                                style: TextStyle(
                                  color: Colors.green,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // distance badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.black12),
                          ),
                          child: Text(
                            distanceLabelForSite(s),
                            style: const TextStyle(
                              color: Colors.black87,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],

        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 0.0),
          child: Text(
            'RECENT SITES',
            style: TextStyle(
              color: Colors.black54,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 8),

        // Site registry list
        Column(
          children: sites.map((s) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const LabourDashboardDetail(),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 20,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        s['name'] as String,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      // Distance badge (from user to site). If user location not available, show '-'.
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.black12),
                        ),
                        child: Text(
                          distanceLabelForSite(s),
                          style: const TextStyle(
                            color: Colors.black87,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  double? _toDouble(Object? v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString());
  }

  /// Haversine distance in meters between two lat/lng points.
  double _haversineDistanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const R = 6371000; // Earth radius in meters
    final dLat = _degToRad(lat2 - lat1);
    final dLon = _degToRad(lon2 - lon1);
    final a =
        (sin(dLat / 2) * sin(dLat / 2)) +
        (cos(_degToRad(lat1)) *
            cos(_degToRad(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2));
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  double _degToRad(double deg) => deg * (pi / 180.0);
}

// end
