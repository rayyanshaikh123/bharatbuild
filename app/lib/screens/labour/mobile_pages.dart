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

/// Content-only labour dashboard used in mobile IndexedStack.
class LabourDashboardContent extends ConsumerWidget {
  const LabourDashboardContent({super.key});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'good_morning'.tr();
    if (hour < 17) return 'good_afternoon'.tr();
    return 'good_evening'.tr();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final displayName = user != null && user['name'] != null ? user['name'] as String : 'Guest';
    final jobsAsync = ref.watch(availableJobsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(availableJobsProvider),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_getGreeting()}, $displayName!',
                        style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'find_work'.tr(),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => ref.read(bottomNavIndexProvider.notifier).state = 2,
                  child: CircleAvatar(
                    radius: 24,
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                    child: Text(
                      displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                      style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Attendance Section
            const _AttendanceSection(),

            const SizedBox(height: 32),

            // Site Map (if checked-in)
            ref.watch(todayAttendanceProvider).maybeWhen(
              data: (attendance) {
                if (attendance != null && attendance['check_out'] == null && attendance['geofence'] != null) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'site_geofence'.tr(),
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      SiteMapWidget(
                        geofence: (attendance['geofence'] as List).map((p) => LatLng(p[0], p[1])).toList(),
                      ),
                      const SizedBox(height: 32),
                    ],
                  );
                }
                return const SizedBox.shrink();
              },
              orElse: () => const SizedBox.shrink(),
            ),
            
            // Available Jobs Title
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'available_jobs'.tr(),
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.tune),
                  onPressed: () {}, // Filter logic
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Jobs List
            jobsAsync.when(
              data: (jobs) {
                if (jobs.isEmpty) {
                  return _buildEmptyState(theme);
                }
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: jobs.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final job = jobs[index];
                    return _JobCard(job: job);
                  },
                );
              },
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(40.0),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (err, stack) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(40.0),
                  child: Text('error'.tr() + ': $err'),
                ),
              ),
            ),
            const SizedBox(height: 100), // Space for bottom nav
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 40),
          Icon(Icons.work_outline, size: 64, color: theme.colorScheme.onSurface.withOpacity(0.2)),
          const SizedBox(height: 16),
          Text(
            'no_jobs_found'.tr(),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.5),
            ),
          ),
        ],
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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final applicationsAsync = ref.watch(myApplicationsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(myApplicationsProvider.future),
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
                return _ApplicationCard(application: app);
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

class _ApplicationCard extends StatelessWidget {
  final dynamic application;

  const _ApplicationCard({required this.application});

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
                  _buildStatusBadge(context, status),
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
    final theme = Theme.of(context);

    // Support both direct user map or {labour: {...}} wrap
    final userData = (user != null && user.containsKey('labour')) ? user['labour'] : user;
    final skillType = userData?['skill_type'] ?? 'Not set';
    final categories = (userData?['categories'] as List?)?.join(', ') ?? 'No trades selected';
    final address = userData?['address'] ?? 'Address not set';

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(refreshUserProvider.future),
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
                ref.read(currentUserProvider.notifier).state = null;
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
    final theme = Theme.of(context);

    return attendanceAsync.when(
      data: (attendance) => _buildAttendanceCard(context, ref, attendance),
      loading: () => const _AttendancePlaceholder(),
      error: (err, _) => const SizedBox.shrink(),
    );
  }

  Widget _buildAttendanceCard(BuildContext context, WidgetRef ref, Map<String, dynamic>? attendance) {
    final theme = Theme.of(context);
    final isCheckedIn = attendance != null && attendance['check_out'] == null;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isCheckedIn ? theme.colorScheme.primary : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: (isCheckedIn ? theme.colorScheme.primary : Colors.black).withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
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
                  isCheckedIn ? Icons.timer_outlined : Icons.touch_app_outlined,
                  color: isCheckedIn ? Colors.white : theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isCheckedIn ? attendance!['project_name'] ?? 'Ongoing Work' : 'not_checked_in'.tr(),
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
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => isCheckedIn ? _handleCheckOut(context, ref) : _handleCheckIn(context, ref),
            style: ElevatedButton.styleFrom(
              backgroundColor: isCheckedIn ? Colors.white : theme.colorScheme.primary,
              foregroundColor: isCheckedIn ? theme.colorScheme.primary : Colors.white,
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
            child: Text(
              (isCheckedIn ? 'check_out' : 'check_in').tr(),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleCheckIn(BuildContext context, WidgetRef ref) async {
    try {
      // 1. Get Location
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }
      
      Position position = await Geolocator.getCurrentPosition();
      
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

      // Show project picker if multiple, or just check-in to the only one
      if (approvedApps.length == 1) {
        await ref.read(checkInProvider({
          'projectId': approvedApps[0]['project_id'],
          'lat': position.latitude,
          'lon': position.longitude,
        }).future);
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
          await ref.read(checkInProvider({
            'projectId': selected['project_id'],
            'lat': position.latitude,
            'lon': position.longitude,
          }).future);
        }
      }

    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
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
