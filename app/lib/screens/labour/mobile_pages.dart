import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../complete_profile_screen.dart';
import '../map/live_map_screen.dart';
import 'operation_zones_live_map.dart';
import '../../theme/app_colors.dart';
import 'profile_screen.dart';
import '../../providers/user_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/auth_providers.dart';
import '../../providers/job_provider.dart';
import 'job_details_screen.dart';
import '../../providers/attendance_provider.dart';
import 'package:geolocator/geolocator.dart';
import '../../widgets/site_map_widget.dart';
import 'package:latlong2/latlong.dart';
import '../../providers/current_project_provider.dart';
import '../../map/geofence_service.dart';
import '../../services/auth_service.dart';
import 'check_in_screen.dart';
import 'jobs_map_screen.dart';
import 'shift_status_screen.dart';
import 'projects_map_screen.dart';
import 'live_tracking_map_screen.dart';
import 'tools_screen.dart';
import 'package:intl/intl.dart';
import '../../providers/wage_provider.dart';
import '../../providers/location_provider.dart';

/// Content-only labour dashboard used in mobile IndexedStack.
class LabourDashboardContent extends ConsumerWidget {
  const LabourDashboardContent({super.key});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'good_morning'.tr();
    if (hour < 17) return 'good_afternoon'.tr();
    return 'good_evening'.tr();
  }

  double _calculateDistance(Position? userPos, double? lat, double? lon, {Map<String, dynamic>? userProfile}) {
    double? uLat;
    double? uLon;

    // 1. Priority: Use Primary Address from Profile (Home Base)
    if (userProfile != null) {
      uLat = userProfile['primary_latitude'] != null ? double.tryParse(userProfile['primary_latitude'].toString()) : null;
      uLon = userProfile['primary_longitude'] != null ? double.tryParse(userProfile['primary_longitude'].toString()) : null;
    }

    // 2. Fallback: Use Live GPS if no Primary Address is set
    if (uLat == null && userPos != null) {
      uLat = userPos.latitude;
      uLon = userPos.longitude;
    }

    if (uLat == null || uLon == null || lat == null || lon == null) return double.infinity;
    try {
      return Geolocator.distanceBetween(uLat, uLon, lat, lon);
    } catch (e) {
      debugPrint('Distance calculation error: $e');
      return double.infinity;
    }
  }

  String _formatDistance(double distance) {
    if (distance == double.infinity) return '';
    if (distance < 1) return 'Near you';
    if (distance < 1000) return '${distance.round()}m';
    return '${(distance / 1000).toStringAsFixed(1)}km';
  }

  Future<void> _updatePrimaryToCurrent(BuildContext context, WidgetRef ref) async {
    final pos = ref.read(locationProvider).value;
    if (pos == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('GPS data not available yet')));
      return;
    }

    try {
      final auth = ref.read(authServiceProvider);
      await auth.updateLabourProfile({
        'primary_latitude': pos.latitude,
        'primary_longitude': pos.longitude,
      });
      // Refresh profiles and dashboard data
      ref.invalidate(profileProvider);
      ref.invalidate(locationProvider);
      
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('primary_address_updated'.tr()), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final displayName = user != null && user['name'] != null ? user['name'] as String : 'Guest';
    
    final jobsAsync = ref.watch(availableJobsProvider);
    final appsAsync = ref.watch(myApplicationsProvider);
    final projectsAsync = ref.watch(allProjectsProvider);
    final locationAsync = ref.watch(locationProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(availableJobsProvider);
        ref.invalidate(myApplicationsProvider);
        ref.invalidate(allProjectsProvider);
        ref.invalidate(locationProvider);
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // 1. Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_getGreeting()},',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          '$displayName!',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildNotificationIcon(theme),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () => ref.read(bottomNavIndexProvider.notifier).state = 2,
                    child: Hero(
                      tag: 'user_avatar',
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: theme.colorScheme.primary.withOpacity(0.2), width: 2),
                        ),
                        child: CircleAvatar(
                          radius: 22,
                          backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                          child: Text(
                            displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                            style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Attendance / Active Work Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: const _AttendanceSection(),
            ),
          ),

          // 3. My Applied Jobs (Horizontal)
          SliverToBoxAdapter(
            child: appsAsync.when(
              data: (apps) {
                if (apps.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 32),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('my_applications'.tr(), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          TextButton(
                            onPressed: () => ref.read(bottomNavIndexProvider.notifier).state = 1,
                            child: Text('view_all'.tr(), style: const TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(
                      height: 180,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        scrollDirection: Axis.horizontal,
                        itemCount: apps.length,
                        itemBuilder: (context, index) {
                          final app = apps[index];
                          final pLat = app['geofence'] != null && app['geofence']['type'] == 'CIRCLE' && app['geofence']['center'] != null
                              ? double.tryParse(app['geofence']['center']['lat'].toString())
                              : double.tryParse(app['latitude'].toString());
                          final pLon = app['geofence'] != null && app['geofence']['type'] == 'CIRCLE' && app['geofence']['center'] != null
                              ? double.tryParse(app['geofence']['center']['lng'].toString())
                              : double.tryParse(app['longitude'].toString());

                          final distance = _calculateDistance(
                            locationAsync.value, 
                            pLat,
                            pLon,
                            userProfile: user,
                          );
                          return _HorizontalApplicationCard(
                            application: app,
                            distance: _formatDistance(distance),
                          );
                        },
                      ),
                    ),
                  ],
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),

          // 4. Explore Projects & Jobs (Unified List)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 40, 20, 16),
            sliver: SliverToBoxAdapter(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('explore_work'.tr(), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                        Text(
                          'nearby_sites_and_jobs'.tr(),
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.5)),
                        ),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => _updatePrimaryToCurrent(context, ref),
                    icon: const Icon(Icons.my_location, size: 16),
                    label: Text('set_current_as_primary'.tr(), style: const TextStyle(fontSize: 11)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      backgroundColor: theme.colorScheme.primary.withOpacity(0.05),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Proximity Sorted List
          _buildSortedWorkList(context, ref, jobsAsync, projectsAsync, locationAsync, user),

          const SliverToBoxAdapter(child: SizedBox(height: 120)),
        ],
      ),
    );
  }

  Widget _buildNotificationIcon(ThemeData theme) {
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
      ),
      child: IconButton(
        icon: Badge(
          child: Icon(Icons.notifications_none_rounded, color: theme.colorScheme.onSurface),
        ),
        onPressed: () {},
      ),
    );
  }

  Widget _buildSortedWorkList(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<List<dynamic>> jobsAsync,
    AsyncValue<List<dynamic>> projectsAsync,
    AsyncValue<Position?> locationAsync,
    Map<String, dynamic>? userProfile,
  ) {
    return locationAsync.when(
      data: (pos) => _combineAndSort(jobsAsync, projectsAsync, pos, userProfile),
      loading: () => const SliverPadding(
        padding: EdgeInsets.all(40),
        sliver: SliverToBoxAdapter(child: Center(child: CircularProgressIndicator())),
      ),
      error: (_, __) => _combineAndSort(jobsAsync, projectsAsync, null, userProfile),
    );
  }

  Widget _combineAndSort(AsyncValue<List<dynamic>> jobsAsync, AsyncValue<List<dynamic>> projectsAsync, Position? userPos, Map<String, dynamic>? userProfile) {
    final jobs = jobsAsync.value ?? [];
    final projects = projectsAsync.value ?? [];

    if (jobs.isEmpty && projects.isEmpty && !jobsAsync.isLoading && !projectsAsync.isLoading) {
      return SliverToBoxAdapter(child: _buildEmptyState(null));
    }

    // Combine projects and jobs uniquely, grouping jobs by project
    final sortedProjects = projects.toList();
    sortedProjects.sort((a, b) {
      final pLatA = a['geofence'] != null && a['geofence']['type'] == 'CIRCLE' && a['geofence']['center'] != null
          ? double.tryParse(a['geofence']['center']['lat'].toString())
          : double.tryParse(a['latitude'].toString());
      final pLonA = a['geofence'] != null && a['geofence']['type'] == 'CIRCLE' && a['geofence']['center'] != null
          ? double.tryParse(a['geofence']['center']['lng'].toString())
          : double.tryParse(a['longitude'].toString());

      final pLatB = b['geofence'] != null && b['geofence']['type'] == 'CIRCLE' && b['geofence']['center'] != null
          ? double.tryParse(b['geofence']['center']['lat'].toString())
          : double.tryParse(b['latitude'].toString());
      final pLonB = b['geofence'] != null && b['geofence']['type'] == 'CIRCLE' && b['geofence']['center'] != null
          ? double.tryParse(b['geofence']['center']['lng'].toString())
          : double.tryParse(b['longitude'].toString());

      final da = _calculateDistance(userPos, pLatA, pLonA, userProfile: userProfile);
      final db = _calculateDistance(userPos, pLatB, pLonB, userProfile: userProfile);
      return da.compareTo(db);
    });

    final Map<String, List<dynamic>> projectJobs = {};
    for (var j in jobs) {
      final pid = j['project_id'].toString();
      projectJobs.putIfAbsent(pid, () => []).add(j);
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final project = sortedProjects[index];
            final pid = project['id'].toString();
            final relatedJobs = projectJobs[pid] ?? [];
            
            final pLat = project['geofence'] != null && project['geofence']['type'] == 'CIRCLE' && project['geofence']['center'] != null
                ? double.tryParse(project['geofence']['center']['lat'].toString())
                : double.tryParse(project['latitude'].toString());
            final pLon = project['geofence'] != null && project['geofence']['type'] == 'CIRCLE' && project['geofence']['center'] != null
                ? double.tryParse(project['geofence']['center']['lng'].toString())
                : double.tryParse(project['longitude'].toString());

            final distance = _calculateDistance(userPos, pLat, pLon, userProfile: userProfile);
            
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _UnifiedProjectCard(
                project: project,
                jobs: relatedJobs,
                distance: _formatDistance(distance),
              ),
            );
          },
          childCount: sortedProjects.length,
        ),
      ),
    );
  }

  Widget _buildEmptyState(ThemeData? theme) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 60),
          Icon(Icons.location_off_rounded, size: 64, color: Colors.grey.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text('no_work_nearby'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
        ],
      ),
    );
  }
}

class _HorizontalApplicationCard extends StatelessWidget {
  final dynamic application;
  final String distance;
  const _HorizontalApplicationCard({required this.application, required this.distance});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = (application['status'] ?? 'pending').toString().toUpperCase();
    
    Color statusColor = Colors.orange;
    if (status == 'APPROVED') statusColor = Colors.green;
    if (status == 'REJECTED') statusColor = Colors.red;

    return Container(
      width: 260,
      margin: const EdgeInsets.only(right: 16, bottom: 8, top: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Text(status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
              if (distance.isNotEmpty)
                Text(distance, style: TextStyle(color: theme.colorScheme.primary, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          const Spacer(),
          Text(application['project_name'] ?? 'Project', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(application['category']?.toString().toUpperCase() ?? 'JOB', style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.5))),
              const Spacer(),
              Icon(Icons.arrow_forward_ios, size: 10, color: theme.colorScheme.onSurface.withOpacity(0.3)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: status == 'APPROVED' ? 1.0 : (status == 'REJECTED' ? 0.0 : 0.5),
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(statusColor),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }
}

class _UnifiedProjectCard extends StatelessWidget {
  final dynamic project;
  final List<dynamic> jobs;
  final String distance;

  const _UnifiedProjectCard({required this.project, required this.jobs, required this.distance});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasJobs = jobs.isNotEmpty;
    final distText = distance;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15, offset: const Offset(0, 4)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: hasJobs 
              ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => JobDetailsScreen(jobId: jobs.first['id'].toString())))
              : null,
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(Icons.business_rounded, color: theme.colorScheme.primary),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(project['name'] ?? 'Construction Site', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.location_on, size: 14, color: Colors.grey[400]),
                              const SizedBox(width: 4),
                              Expanded(child: Text(project['location_text'] ?? '', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]), maxLines: 1, overflow: TextOverflow.ellipsis)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    _buildSideInfo(theme),
                  ],
                ),
              if (hasJobs) ...[
                const SizedBox(height: 20),
                const Divider(height: 1),
                const SizedBox(height: 16),
                Text('openings'.tr(), style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.bold, letterSpacing: 1.0, color: Colors.grey[400])),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: jobs.map((j) => _JobChip(
                    job: j, 
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => JobDetailsScreen(jobId: j['id'].toString()))),
                  )).toList(),
                ),
              ] else ...[
                const SizedBox(height: 16),
                Text('no_active_openings'.tr(), style: theme.textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic, color: Colors.grey[400])),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}

  Widget _buildSideInfo(ThemeData theme) {
    final potentialWage = project['wage'];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (distance.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(distance, style: TextStyle(color: theme.colorScheme.secondary, fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        if (project['budget'] != null) ...[
          const SizedBox(height: 4),
          Text(
            '₹${NumberFormat.compact().format(double.tryParse(project['budget'].toString()) ?? 0)}',
            style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold, color: Colors.green[700]),
          ),
        ],
        if (potentialWage != null) ...[
          const SizedBox(height: 4),
          Text(
            'Up to ₹$potentialWage/day',
            style: TextStyle(fontSize: 9, color: Colors.grey[500], fontWeight: FontWeight.bold),
          ),
        ],
      ],
    );
  }
}

class _JobChip extends StatelessWidget {
  final dynamic job;
  final VoidCallback onTap;
  const _JobChip({required this.job, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isFull = (job['current_count'] ?? 0) >= (job['required_count'] ?? 0);
    final wage = job['wage_rate'];
    
    return InkWell(
      onTap: isFull ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isFull ? Colors.grey[100] : theme.colorScheme.primary.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isFull ? Colors.grey[200]! : theme.colorScheme.primary.withOpacity(0.1)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  job['category']?.toString().toUpperCase() ?? '',
                  style: TextStyle(
                    color: isFull ? Colors.grey[400] : theme.colorScheme.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
                if (wage != null)
                  Text(
                    '₹$wage/hr',
                    style: TextStyle(
                      color: isFull ? Colors.grey[400] : Colors.green[700],
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 8),
            if (isFull)
               Text('FULL', style: TextStyle(color: Colors.red[300], fontSize: 10, fontWeight: FontWeight.bold))
            else
              Text('${job['required_count']} pos', style: TextStyle(color: Colors.grey[500], fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

class _JobCard extends ConsumerStatefulWidget {
  final dynamic job;
  const _JobCard({required this.job});

  @override
  ConsumerState<_JobCard> createState() => _JobCardState();
}

class _JobCardState extends ConsumerState<_JobCard> {
  bool _isApplying = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final job = widget.job;
    final distance = job['distance_meters'] != null
        ? (double.tryParse(job['distance_meters'].toString()) ?? 0).round()
        : null;

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => JobDetailsScreen(jobId: job['id'].toString()),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    job['category']?.toString().toUpperCase() ?? '',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '${job['required_count']} ${'required_workers'.tr()}',
                  style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              job['project_name'] ?? 'Construction Site',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.location_on, size: 14, color: theme.colorScheme.primary),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    job['location_text'] ?? 'Unknown Location',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ),
                if (distance != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    distance < 1000 ? '${distance}m' : '${(distance / 1000).toStringAsFixed(1)}km',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isApplying ? null : _handleApply,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isApplying
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text('apply_now'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleApply() async {
    setState(() => _isApplying = true);
    try {
      await ref.read(applyForJobProvider(widget.job['id'].toString()).future);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('applied'.tr())),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('error'.tr() + ': $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isApplying = false);
    }
  }
}

class ApplicationsContent extends ConsumerWidget {
  const ApplicationsContent({super.key});

  double _calculateDistance(Position? userPos, double? lat, double? lon, {Map<String, dynamic>? userProfile}) {
    double? uLat;
    double? uLon;

    if (userProfile != null) {
      uLat = userProfile['primary_latitude'] != null ? double.tryParse(userProfile['primary_latitude'].toString()) : null;
      uLon = userProfile['primary_longitude'] != null ? double.tryParse(userProfile['primary_longitude'].toString()) : null;
    }

    if (uLat == null && userPos != null) {
      uLat = userPos.latitude;
      uLon = userPos.longitude;
    }

    if (uLat == null || uLon == null || lat == null || lon == null) return double.infinity;
    try {
      return Geolocator.distanceBetween(uLat, uLon, lat, lon);
    } catch (_) {
      return double.infinity;
    }
  }

  String _formatDistance(double distance) {
    if (distance == double.infinity) return '';
    if (distance < 1) return 'Near you';
    if (distance < 1000) return '${distance.round()}m';
    return '${(distance / 1000).toStringAsFixed(1)}km';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final applicationsAsync = ref.watch(myApplicationsProvider);
    final locationAsync = ref.watch(locationProvider);
    final userProfile = ref.watch(currentUserProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.refresh(myApplicationsProvider.future);
          ref.refresh(locationProvider.future);
        },
        child: applicationsAsync.when(
          data: (apps) {
            if (apps.isEmpty) {
              return _buildEmptyState(context);
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: apps.length,
              itemBuilder: (context, index) {
                final app = apps[index];
                
                final pLat = app['geofence'] != null && app['geofence']['type'] == 'CIRCLE' && app['geofence']['center'] != null
                    ? double.tryParse(app['geofence']['center']['lat'].toString())
                    : double.tryParse(app['latitude'].toString());
                final pLon = app['geofence'] != null && app['geofence']['type'] == 'CIRCLE' && app['geofence']['center'] != null
                    ? double.tryParse(app['geofence']['center']['lng'].toString())
                    : double.tryParse(app['longitude'].toString());

                final distValue = _calculateDistance(
                  locationAsync.value, 
                  pLat,
                  pLon,
                  userProfile: userProfile,
                );
                return _ApplicationCard(
                  application: app,
                  distance: _formatDistance(distValue),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Error: $err')),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Container(
        height: MediaQuery.of(context).size.height - 200,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.description_outlined, size: 64, color: theme.colorScheme.primary),
            ),
            const SizedBox(height: 24),
            Text(
              'no_applications'.tr(),
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}

class EarningsContent extends ConsumerWidget {
  const EarningsContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wagesAsync = ref.watch(myWagesProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(myWagesProvider.future),
        child: wagesAsync.when(
          data: (data) {
            final wages = data['wages'] as List<dynamic>;
            final summary = data['summary'] as Map<String, dynamic>;
            final weeklyStats = data['weekly_stats'] as List<dynamic>;

            if (wages.isEmpty && weeklyStats.isEmpty) {
              return _buildEmptyState(context);
            }

            return CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.all(20),
                  sliver: SliverToBoxAdapter(
                    child: _EarningsSummary(summary: summary, weeklyStats: weeklyStats),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverToBoxAdapter(
                    child: Text(
                      'payment_history'.tr(),
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        return _WageCard(wage: wages[index]);
                      },
                      childCount: wages.length,
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Error: $err')),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.payments_outlined, size: 64, color: theme.colorScheme.primary),
          ),
          const SizedBox(height: 24),
          Text(
            'no_earnings_yet'.tr(),
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _EarningsSummary extends StatelessWidget {
  final Map<String, dynamic> summary;
  final List<dynamic> weeklyStats;

  const _EarningsSummary({required this.summary, required this.weeklyStats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalEarnings = double.tryParse(summary['total_earnings']?.toString() ?? '0') ?? 0;
    final unpaidEarnings = double.tryParse(summary['unpaid_earnings']?.toString() ?? '0') ?? 0;
    final pendingEarnings = double.tryParse(summary['pending_earnings']?.toString() ?? '0') ?? 0;

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [theme.colorScheme.primary, theme.colorScheme.primary.withBlue(200)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: theme.colorScheme.primary.withOpacity(0.3),
                blurRadius: 15,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'total_earnings'.tr(),
                style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14),
              ),
              const SizedBox(height: 8),
              Text(
                '₹${totalEarnings.toStringAsFixed(0)}',
                style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              if (weeklyStats.isNotEmpty) ...[
                Text(
                  'weekly_overview'.tr(),
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                _buildMiniChart(weeklyStats),
                const SizedBox(height: 24),
              ],
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _summaryMiniItem('unpaid'.tr(), '₹${unpaidEarnings.toStringAsFixed(0)}'),
                  _summaryMiniItem('pending'.tr(), '₹${pendingEarnings.toStringAsFixed(0)}'),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMiniChart(List<dynamic> stats) {
    // Take last 4 weeks and reverse for chronological order
    final displayStats = stats.reversed.toList();
    double maxAmount = 0;
    for (var s in displayStats) {
      final amt = double.tryParse(s['amount']?.toString() ?? '0') ?? 0;
      if (amt > maxAmount) maxAmount = amt;
    }
    if (maxAmount == 0) maxAmount = 1;

    return SizedBox(
      height: 60,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: displayStats.map((s) {
          final amt = double.tryParse(s['amount']?.toString() ?? '0') ?? 0;
          final heightFactor = amt / maxAmount;
          return Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Container(
                width: 40,
                height: 40 * heightFactor,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'W${displayStats.indexOf(s) + 1}',
                style: const TextStyle(color: Colors.white, fontSize: 10),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _summaryMiniItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
        ),
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

class _WageCard extends StatelessWidget {
  final dynamic wage;

  const _WageCard({required this.wage});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = wage['status']?.toString().toLowerCase() ?? 'pending';
    final amount = double.tryParse(wage['total_amount']?.toString() ?? '0') ?? 0;
    final date = wage['attendance_date']?.toString().split('T')[0] ?? '';
    final isPaid = wage['paid_at'] != null;

    Color statusColor;
    IconData statusIcon;
    switch (status) {
      case 'approved':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle_outline;
        break;
      case 'rejected':
        statusColor = Colors.red;
        statusIcon = Icons.highlight_off;
        break;
      default:
        statusColor = Colors.orange;
        statusIcon = Icons.pending_outlined;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.05)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(statusIcon, color: statusColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  wage['project_name'] ?? 'Project',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  DateFormat('EEE, dd MMM yyyy').format(DateTime.parse(date)),
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${amount.toStringAsFixed(0)}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              if (isPaid)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('PAID', style: TextStyle(color: Colors.blue, fontSize: 10, fontWeight: FontWeight.bold)),
                )
              else if (status == 'approved')
                Text(
                  'approved'.tr(),
                  style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
                )
              else
                Text(
                  status.toUpperCase(),
                  style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ApplicationCard extends StatelessWidget {
  final dynamic application;
  final String distance;

  const _ApplicationCard({required this.application, required this.distance});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = application['status'] ?? 'pending';

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => JobDetailsScreen(jobId: application['labour_request_id'].toString()),
          ),
        ),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      application['category']?.toString().toUpperCase() ?? '',
                      style: TextStyle(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  if (distance.isNotEmpty)
                    Text(
                      distance,
                      style: TextStyle(color: theme.colorScheme.secondary, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  Row(
                    children: [
                      _buildStatusBadge(context, status),
                      if (application['current_count'] != null && 
                          application['required_count'] != null && 
                          (application['current_count'] as int) >= (application['required_count'] as int))
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.withOpacity(0.2)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.group_off, size: 12, color: Colors.red),
                              SizedBox(width: 4),
                              Text('FULL', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 10)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                application['project_name'] ?? 'Project',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.location_on, size: 14, color: theme.colorScheme.primary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      application['location_text'] ?? 'Unknown Location',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Text(
                'Applied on: ${application['joined_at']?.toString().split('T')[0] ?? ''}',
                style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.4)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(BuildContext context, String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'approved':
        color = Colors.green;
        break;
      case 'rejected':
        color = Colors.red;
        break;
      case 'ongoing':
        color = Colors.blue;
        break;
      default:
        color = Colors.orange;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 10),
      ),
    );
  }
}

class ProfileContent extends ConsumerWidget {
  const ProfileContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final profileAsync = ref.watch(profileProvider);
    final theme = Theme.of(context);

    // Support both direct user map or {labour: {...}} wrap
    final userData = user;
    final skillType = userData?['skill_type'] ?? 'Not set';
    final categories = userData?['categories'] is List 
        ? (userData?['categories'] as List).join(', ') 
        : (userData?['categories']?.toString() ?? 'No trades selected');
    final address = userData?['address'] ?? 'Address not set';

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(profileProvider.future),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
      child: Column(
        children: [
          const SizedBox(height: 20),
          CircleAvatar(
            radius: 50,
            backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
            child: Text(
              user != null && user['name'] != null ? (user['name'] as String)[0].toUpperCase() : '?',
              style: TextStyle(fontSize: 32, color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            user != null && user['name'] != null ? user['name'] as String : 'Guest User',
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          Text(
            user != null && user['phone'] != null ? user['phone'] as String : '',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.5)),
          ),
          const SizedBox(height: 32),

          // Details Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
              ],
            ),
            child: Column(
              children: [
                _infoRow(context, 'skill_type'.tr(), skillType),
                const Divider(height: 32),
                _infoRow(context, 'trades'.tr(), categories),
                const Divider(height: 32),
                _infoRow(context, 'address'.tr(), address),
              ],
            ),
          ),

          const SizedBox(height: 32),
          _profileMenuItem(
            context,
            'edit_profile'.tr(),
            Icons.edit_outlined,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CompleteProfileScreen(isEditing: true)),
            ),
          ),
          _profileMenuItem(
            context,
            'manage_addresses'.tr(),
            Icons.map_outlined,
            onTap: () => Navigator.pushNamed(context, '/addresses'),
          ),
          const SizedBox(height: 12),
          _profileMenuItem(
            context,
            'settings'.tr(),
            Icons.settings_outlined,
            onTap: () => Navigator.pushNamed(context, '/settings'),
          ),
          _profileMenuItem(
            context,
            'notifications'.tr(),
            Icons.notifications_outlined,
            onTap: () => Navigator.pushNamed(context, '/notifications'),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 56),
            ),
            onPressed: () async {
              final auth = ref.read(authServiceProvider);
              try {
                await auth.logoutLabour();
                ref.read(currentUserProvider.notifier).setUser(null);
                ref.read(bottomNavIndexProvider.notifier).state = 0;
                if (!context.mounted) return;
                Navigator.pushNamedAndRemoveUntil(context, '/onboarding', (route) => false);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('logout_failed'.tr() + ': $e')),
                  );
                }
              }
            },
            child: Text('logout'.tr()),
          ),
        ],
      ),
    ),
  );
}

  Widget _infoRow(BuildContext context, String label, String value) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
          ),
        ),
        Expanded(
          flex: 3,
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _profileMenuItem(BuildContext context, String text, IconData icon, {required VoidCallback onTap}) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: theme.colorScheme.primary),
        title: Text(text),
        trailing: const Icon(Icons.chevron_right),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: theme.colorScheme.outline.withOpacity(0.1)),
        ),
      ),
    );
  }
}

class _AttendanceSection extends ConsumerWidget {
  const _AttendanceSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceAsync = ref.watch(todayAttendanceProvider);
    final appsAsync = ref.watch(myApplicationsProvider);
    final theme = Theme.of(context);

    return attendanceAsync.when(
      data: (attendance) => _buildAttendanceCard(context, ref, attendance, appsAsync.value),
      loading: () => const _AttendancePlaceholder(),
      error: (err, _) => const SizedBox.shrink(),
    );
  }

  Widget _buildAttendanceCard(BuildContext context, WidgetRef ref, Map<String, dynamic>? attendance, List<dynamic>? applications) {
    final theme = Theme.of(context);
    final isCheckedIn = attendance != null && attendance['check_out'] == null;

    // If not checked in, find the first APPROVED application
    final approvedApp = !isCheckedIn && applications != null 
        ? applications.firstWhere((a) => a['status'] == 'APPROVED', orElse: () => null)
        : null;

    final showActiveProject = isCheckedIn || approvedApp != null;
    final projectName = isCheckedIn 
        ? (attendance!['project_name'] ?? 'Ongoing Work')
        : (approvedApp?['project_name'] ?? 'Ready to Work');
    
    final locationText = isCheckedIn ? '' : (approvedApp?['location_text'] ?? '');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isCheckedIn ? theme.colorScheme.primary : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isCheckedIn 
              ? theme.colorScheme.primary 
              : (approvedApp != null ? theme.colorScheme.primary.withOpacity(0.5) : theme.colorScheme.outline.withOpacity(0.1))
        ),
        boxShadow: [
          BoxShadow(
            color: (isCheckedIn ? theme.colorScheme.primary : Colors.black).withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (isCheckedIn ? Colors.white : theme.colorScheme.primary).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCheckedIn ? Icons.timer_outlined : (approvedApp != null ? Icons.assignment_turned_in_outlined : Icons.touch_app_outlined),
                  color: isCheckedIn ? Colors.white : theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      showActiveProject ? projectName : 'not_checked_in'.tr(),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isCheckedIn ? Colors.white : theme.colorScheme.onSurface,
                      ),
                    ),
                    if (isCheckedIn)
                      Text(
                        'checked_in_at'.tr(args: [attendance!['check_in'].toString().split('T')[1].substring(0, 5)]),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white.withOpacity(0.8),
                        ),
                      )
                    else if (approvedApp != null)
                      Text(
                        'Approved for Site • $locationText',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: isCheckedIn 
                      ? () => _handleCheckOut(context, ref)
                      : (approvedApp != null 
                          ? () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckInScreen()))
                          : () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckInScreen()))), // Fallback to general check-in
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isCheckedIn ? Colors.white : theme.colorScheme.primary,
                    foregroundColor: isCheckedIn ? theme.colorScheme.primary : Colors.white,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: Text(
                    (isCheckedIn ? 'check_out' : 'check_in').tr(),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
              if (isCheckedIn) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (attendance == null) return;
                       Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => LiveTrackingMapScreen(project: attendance),
                        ),
                      );
                    },
                    icon: const Icon(Icons.map_outlined, size: 18),
                    label: Text('site_tracking'.tr(), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withOpacity(0.2),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _handleCheckInOld(BuildContext context, WidgetRef ref) async {
    try {
      // 1. Get Location
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission is required for check-in')),
            );
          }
          return;
        }
      }
      
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      // 2. Fetch approved applications to choose a site
      final apps = await ref.read(myApplicationsProvider.future);
      final approvedApps = apps.where((a) => a['status'] == 'APPROVED').toList();
      
      if (approvedApps.isEmpty) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No approved projects found for check-in')),
          );
        }
        return;
      }

      // Helper function to validate and check-in
      Future<void> validateAndCheckIn(Map<String, dynamic> application) async {
        final authService = ref.read(authServiceProvider);
        final geofenceService = GeofenceService();
        
        try {
          // Get job details including project geofence (using labour_request_id)
          final labourRequestId = application['labour_request_id']?.toString() ?? 
                                  application['id']?.toString();
          
          if (labourRequestId == null) {
            throw Exception('Unable to find labour request ID');
          }
          
          final jobDetails = await authService.getJobDetails(labourRequestId);
          
          // Validate geofence
          final validation = geofenceService.validateGeofence(
            position.latitude,
            position.longitude,
            jobDetails,
          );
          
          if (!validation['isValid'] as bool) {
            final distance = validation['distance'] as int;
            final allowedRadius = validation['allowedRadius'] as int;
            
            if (context.mounted) {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Outside Geofence'),
                  content: Text(
                    'You are ${distance}m away from the project site.\n\n'
                    'Allowed radius: ${allowedRadius}m\n\n'
                    'Please move closer to the project location to check in.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('OK'),
                    ),
                  ],
                ),
              );
            }
            return;
          }
          
          // Proceed with check-in
          await ref.read(checkInProvider({
            'projectId': application['project_id'],
            'lat': position.latitude,
            'lon': position.longitude,
          }).future);
          
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Checked in successfully'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }

      // Show project picker if multiple, or just check-in to the only one
      if (approvedApps.length == 1) {
        await validateAndCheckIn(approvedApps[0]);
      } else {
        // Show project picker dialog
        if (!context.mounted) return;
        final selected = await showDialog<dynamic>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Select Project'),
            content: SizedBox(
              width: double.maxFinite,
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: approvedApps.length,
                itemBuilder: (context, index) => ListTile(
                  title: Text(approvedApps[index]['project_name'] ?? 'Project'),
                  onTap: () => Navigator.pop(context, approvedApps[index]),
                ),
              ),
            ),
          ),
        );

        if (selected != null && context.mounted) {
          await validateAndCheckIn(selected);
        }
      }

    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleCheckOut(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(checkOutProvider.future);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }
}

class _AttendancePlaceholder extends StatelessWidget {
  const _AttendancePlaceholder();
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(24),
      ),
    );
  }
}
