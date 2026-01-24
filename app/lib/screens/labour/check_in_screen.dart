import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_map/flutter_map.dart';
import '../../providers/job_provider.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_providers.dart';
import '../../services/auth_service.dart';
import '../../map/geofence_service.dart';
import '../../providers/user_provider.dart';
import '../../widgets/site_map_widget.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/tracking_service.dart';
import '../../theme/app_colors.dart';
import 'shift_status_screen.dart';

class CheckInScreen extends ConsumerStatefulWidget {
  const CheckInScreen({super.key});

  @override
  ConsumerState<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends ConsumerState<CheckInScreen> {
  Position? _currentPosition;
  bool _isLoadingLocation = false;
  String? _selectedProjectId;
  Map<String, dynamic>? _selectedProject;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingLocation = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission is required')),
            );
          }
          return;
        }
      }
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _isLoadingLocation = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingLocation = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error getting location: $e')),
        );
      }
    }
  }

  Future<void> _handleCheckIn() async {
    if (_selectedProjectId == null || _currentPosition == null) return;

    final authService = ref.read(authServiceProvider);
    final geofenceService = GeofenceService();

    try {
      // Get project details with geofence
      final applications = await ref.read(myApplicationsProvider.future);
      final application = applications.firstWhere(
        (a) => a['project_id'].toString() == _selectedProjectId,
        orElse: () => null,
      );

      if (application == null) {
        throw Exception('Project not found');
      }

      final labourRequestId = application['labour_request_id']?.toString() ?? 
                              application['id']?.toString();
      
      if (labourRequestId == null) {
        throw Exception('Unable to find labour request ID');
      }

      final jobDetails = await authService.getJobDetails(labourRequestId);
      
      // Validate geofence
      final validation = geofenceService.validateGeofence(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        jobDetails,
      );
      
      if (!validation['isValid'] as bool) {
        final distance = validation['distance'] as int;
        final allowedRadius = validation['allowedRadius'] as int;
        
        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Outside Geofence'),
              content: Text(
                'You are ${distance.abs()}m ${distance < 0 ? 'inside' : 'away from'} the project site.\n\n'
                '${allowedRadius > 0 ? 'Allowed radius: ${allowedRadius}m\n\n' : ''}'
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
        'projectId': _selectedProjectId!,
        'lat': _currentPosition!.latitude,
        'lon': _currentPosition!.longitude,
      }).future);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Checked in successfully'),
            backgroundColor: Colors.green,
          ),
        );
        // Start tracking
        final user = ref.read(currentUserProvider);
        if (user != null) {
          TrackingService().startTracking(
            project: jobDetails,
            userRole: 'LABOUR',
            userId: user['id'].toString(),
          );
        }

        // Navigate to shift status screen
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const ShiftStatusScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final applicationsAsync = ref.watch(myApplicationsProvider);
    final todayStatusAsync = ref.watch(todayAttendanceProvider);

    // Automatic redirection if already checked in
    todayStatusAsync.whenData((att) {
      if (att != null && att['active_session'] != null && att['active_session']['is_active'] == true) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ShiftStatusScreen()));
        });
      }
    });
    
    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: Text('check_in'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: theme.colorScheme.onSurface,
      ),
      body: applicationsAsync.when(
        data: (applications) {
          if (applications.isEmpty) {
            return _buildEmptyState(theme);
          }

          // Sort by distance if location is available
          final List<dynamic> sortedProjects = List.from(applications);
          if (_currentPosition != null) {
             sortedProjects.sort((a, b) {
               final distA = a['distance_meters'] ?? double.infinity;
               final distB = b['distance_meters'] ?? double.infinity;
               return distA.compareTo(distB);
             });

             // Automatic Selection: If not selected and inside geofence, auto-pick
             if (_selectedProjectId == null) {
                final geofenceService = GeofenceService();
                for (final app in sortedProjects) {
                  final validation = geofenceService.validateGeofence(
                    _currentPosition!.latitude, 
                    _currentPosition!.longitude, 
                    app
                  );
                  if (validation['isValid'] == true) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      setState(() {
                        _selectedProjectId = app['project_id'].toString();
                        _selectedProject = app;
                      });
                    });
                    break;
                  }
                }
             }
          }

          return Column(
            children: [
              _buildSiteMapHeader(sortedProjects),
              
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  decoration: BoxDecoration(
                    color: theme.scaffoldBackgroundColor,
                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('active_sites'.tr(), style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold, fontSize: 20)),
                          TextButton.icon(
                            onPressed: _getCurrentLocation,
                            icon: Icon(Icons.my_location, size: 16, color: AppColors.primary),
                            label: Text('refresh'.tr(), style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: ListView.separated(
                          itemCount: sortedProjects.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final app = sortedProjects[index];
                            final isSelected = _selectedProjectId == app['project_id'].toString();
                            
                            return _ProjectSelectionCard(
                              project: app,
                              isSelected: isSelected,
                              onTap: () {
                                setState(() {
                                  _selectedProjectId = app['project_id'].toString();
                                  _selectedProject = app;
                                });
                              },
                              theme: theme,
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              _buildBottomAction(theme),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: Colors.grey[100], shape: BoxShape.circle),
            child: Icon(Icons.work_outline, size: 64, color: Colors.grey[400]),
          ),
          const SizedBox(height: 24),
          Text('no_projects_found'.tr(), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: Colors.grey[700])),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: Text(
              'find_work_hint'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[500], height: 1.5),
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text('explore_work'.tr()),
          ),
        ],
      ),
    );
  }

  Widget _buildSiteMapHeader(List<dynamic> projects) {
    final projectsForMap = projects.map((app) => {
      'id': app['project_id'],
      'name': app['project_name'] ?? 'Project',
      'latitude': app['latitude'] ?? 0.0,
      'longitude': app['longitude'] ?? 0.0,
      'location_text': app['location_text'] ?? '',
      'geofence': app['geofence'],
    }).toList();

    return SizedBox(
      height: 200,
      child: Stack(
        children: [
          SiteMapWidget(projectsData: projectsForMap, geofences: const []),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.white.withOpacity(0.8), Colors.transparent],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction(ThemeData theme) {
    final hasSelected = _selectedProjectId != null;
    final canCheckIn = hasSelected && !_isLoadingLocation;
    
    // Check if inside geofence if location is available
    bool isInside = false;
    if (_currentPosition != null && _selectedProject != null) {
      final validation = GeofenceService().validateGeofence(
        _currentPosition!.latitude, 
        _currentPosition!.longitude, 
        _selectedProject
      );
      isInside = validation['isValid'] == true;
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_currentPosition != null && hasSelected)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isInside ? Icons.verified_user : Icons.warning_amber_rounded, 
                    size: 16, 
                    color: isInside ? Colors.green : Colors.orange
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isInside ? 'Inside Site' : 'Outside site (Attendance tracking will be paused)',
                    style: TextStyle(
                      color: isInside ? Colors.green[700] : Colors.orange[700], 
                      fontSize: 12, 
                      fontWeight: FontWeight.bold
                    ),
                  ),
                ],
              ),
            ),
          ElevatedButton(
            onPressed: canCheckIn ? _handleCheckIn : null,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 64),
              backgroundColor: isInside ? AppColors.primary : Colors.grey[700],
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              elevation: 4,
              shadowColor: AppColors.primary.withOpacity(0.4),
            ),
            child: _isLoadingLocation
                ? const CircularProgressIndicator(color: Colors.white)
                : Text(
                    'start_timer'.tr().toUpperCase() + ' (Auto Attendance)',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                  ),
          ),
          if (hasSelected && !isInside && !_isLoadingLocation)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Move closer to project location to begin high-precision tracking.',
                style: TextStyle(color: Colors.grey[600], fontSize: 11),
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
    );
  }
}

class _ProjectSelectionCard extends StatelessWidget {
  final dynamic project;
  final bool isSelected;
  final VoidCallback onTap;
  final ThemeData theme;

  const _ProjectSelectionCard({
    required this.project,
    required this.isSelected,
    required this.onTap,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.05) : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected ? AppColors.primary : theme.colorScheme.outline.withOpacity(0.1),
            width: 2,
          ),
          boxShadow: isSelected ? [
            BoxShadow(color: AppColors.primary.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
          ] : null,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.grey[100],
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.business_rounded, 
                color: isSelected ? Colors.white : Colors.grey[600],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project['project_name'] ?? 'Project',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: isSelected ? AppColors.primary : theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 12, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          project['location_text'] ?? '',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: AppColors.primary)
            else if (project['distance_meters'] != null)
              Text(
                '${(project['distance_meters'] / 1000).toStringAsFixed(1)}km',
                style: TextStyle(color: Colors.grey[400], fontSize: 11, fontWeight: FontWeight.bold),
              ),
          ],
        ),
      ),
    );
  }
}

