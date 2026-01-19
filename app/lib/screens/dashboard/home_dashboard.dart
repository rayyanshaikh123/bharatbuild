import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/site_provider.dart';
import '../../map/geofence_service.dart';
import '../../location/location_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_theme.dart';

class HomeDashboard extends ConsumerStatefulWidget {
  const HomeDashboard({super.key});

  @override
  ConsumerState<HomeDashboard> createState() => _HomeDashboardState();
}

class _HomeDashboardState extends ConsumerState<HomeDashboard> {
  final _loc = LocationService();
  final _geofence = GeofenceService();
  bool _inside = false;
  double _distance = 0.0;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    await _loc.requestPermission();
    final pos = await _loc.getCurrentPosition();
    final site = ref.read(assignedSiteProvider);
    if (site != null) {
      final isIn = _geofence.isPointInside([
        pos.latitude,
        pos.longitude,
      ], site.polygon);
      final d = await _geofence.distanceToSite([
        pos.latitude,
        pos.longitude,
      ], site.polygon);
      setState(() {
        _inside = isIn;
        _distance = d;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final site = ref.watch(assignedSiteProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Dashboard',
          style: Theme.of(context).textTheme.headingMedium,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Assigned Site:',
              style: Theme.of(context).textTheme.headingMedium,
            ),
            const SizedBox(height: 8),
            if (site != null)
              Text(site.siteName, style: Theme.of(context).textTheme.bodyStyle)
            else
              Text(
                'No site assigned',
                style: Theme.of(context).textTheme.mutedStyle,
              ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                title: Text(
                  _inside ? 'You are inside site' : 'Outside site',
                  style: Theme.of(context).textTheme.headingMedium,
                ),
                subtitle: Text(
                  'Distance: ${_distance.toStringAsFixed(0)} m',
                  style: Theme.of(context).textTheme.mutedStyle,
                ),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
              ),
              onPressed: _inside ? () {} : null,
              child: const Text('Check-In'),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
              ),
              onPressed: _inside ? () {} : null,
              child: const Text('Check-Out'),
            ),
          ],
        ),
      ),
    );
  }
}
