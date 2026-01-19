import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// flutter_map temporarily removed from preview to avoid API mismatch during build

import '../../layouts/app_layout.dart';
import '../../services/persistent_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/user_provider.dart';
import 'project_geofence_screen.dart';

/// Content-only labour dashboard — intended to be embedded inside `AppLayout`.
class LabourDashboardContent extends ConsumerStatefulWidget {
  const LabourDashboardContent({super.key});

  @override
  ConsumerState<LabourDashboardContent> createState() =>
      _LabourDashboardContentState();
}

class _LabourDashboardContentState
    extends ConsumerState<LabourDashboardContent> {
  bool _modalShown = false;
  // Mock nearby sites — replace with backend fetch later
  final List<Map<String, dynamic>> _nearbySites = [];

  @override
  void initState() {
    super.initState();
    // sample data
    _nearbySites.addAll([
      {
        'id': 1,
        'name': 'Oberoi Sky City',
        'address': 'Block A, Sector 12',
        'latitude': 28.6210,
        'longitude': 77.2075,
        'radius': 200,
        'distance': 120,
        'description': 'Residential tower construction',
      },
      {
        'id': 2,
        'name': 'DLF Plaza Site',
        'address': 'Plot 9, Phase 2',
        'latitude': 28.6158,
        'longitude': 77.2130,
        'radius': 300,
        'distance': 420,
        'description': 'Commercial complex',
      },
      {
        'id': 3,
        'name': 'Greenfield Heights',
        'address': 'Near Ring Road',
        'latitude': 28.6100,
        'longitude': 77.2000,
        'radius': 250,
        'distance': 800,
        'description': 'Mixed-use development',
      },
    ]);
  }

  void _openProject(Map<String, dynamic> site) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ProjectGeofenceScreen(project: site)),
    );
  }

  void _maybeShowProfileModal() {
    if (_modalShown) return;
    final user = ref.read(currentUserProvider);
    // debug
    // ignore: avoid_print
    print('LabourDashboard: currentUserProvider -> $user');
    if (user == null) return;
    // support both shapes: {labour: {...}} or direct labour map
    final labour = (user is Map && user.containsKey('labour'))
        ? user['labour']
        : user;
    // debug
    // ignore: avoid_print
    print('LabourDashboard: resolved labour -> $labour');
    if (labour == null || labour is! Map) return;
    final needsProfile =
        (labour['skill_type'] == null) ||
        (labour['primary_latitude'] == null) ||
        (labour['primary_longitude'] == null) ||
        (labour['categories'] == null ||
            (labour['categories'] is List &&
                (labour['categories'] as List).isEmpty));
    // debug
    // ignore: avoid_print
    print('LabourDashboard: needsProfile -> $needsProfile');
    if (needsProfile) {
      _modalShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _showProfileModal());
    }
  }

  Future<void> _showProfileModal() async {
    // debug
    // ignore: avoid_print
    print('LabourDashboard: _showProfileModal called');
    final theme = Theme.of(context);
    final _skillTypes = ['SKILLED', 'UNSKILLED', 'LABOUR'];
    String selectedSkill = _skillTypes.first;
    final TextEditingController categoriesCtl = TextEditingController();
    final TextEditingController addressCtl = TextEditingController();
    final TextEditingController radiusCtl = TextEditingController(text: '500');
    bool loading = false;
    // local selection state for categories inside the modal
    final List<String> selectedCategories = [];
    final List<String> _presetCategories = [
      'Masonry',
      'Carpentry',
      'Plumbing',
      'Electrical',
      'Painting',
      'Tiling',
    ];

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setState) {
            return AlertDialog(
              title: const Text('Complete your profile'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Skill type', style: theme.textTheme.bodyMedium),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: selectedSkill,
                      items: _skillTypes
                          .map(
                            (s) => DropdownMenuItem(value: s, child: Text(s)),
                          )
                          .toList(),
                      onChanged: (v) =>
                          setState(() => selectedSkill = v ?? selectedSkill),
                    ),
                    const SizedBox(height: 12),
                    Text('Categories', style: theme.textTheme.bodyMedium),
                    const SizedBox(height: 8),
                    // Selected categories chips
                    if (selectedCategories.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: selectedCategories
                              .map(
                                (c) => Chip(
                                  label: Text(c),
                                  onDeleted: () => setState(
                                    () => selectedCategories.remove(c),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                    // Preset suggestions as toggleable chips
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _presetCategories.map((cat) {
                        final selected = selectedCategories.contains(cat);
                        return FilterChip(
                          label: Text(cat),
                          selected: selected,
                          onSelected: (v) {
                            setState(() {
                              if (v) {
                                if (!selectedCategories.contains(cat))
                                  selectedCategories.add(cat);
                              } else {
                                selectedCategories.remove(cat);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 8),
                    // Custom category input
                    TextField(
                      controller: categoriesCtl,
                      decoration: const InputDecoration(
                        hintText: 'Add category and press Enter',
                      ),
                      onSubmitted: (val) {
                        final v = val.trim();
                        if (v.isEmpty) return;
                        setState(() {
                          if (!selectedCategories.contains(v))
                            selectedCategories.add(v);
                          categoriesCtl.clear();
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    Text('Address', style: theme.textTheme.bodyMedium),
                    const SizedBox(height: 8),
                    TextField(controller: addressCtl),
                    const SizedBox(height: 12),
                    Text(
                      'Travel radius (meters)',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: radiusCtl,
                      keyboardType: TextInputType.number,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: loading ? null : () => Navigator.of(ctx).pop(),
                  child: const Text('Skip'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00BF6D),
                  ),
                  onPressed: loading
                      ? null
                      : () async {
                          final extra = categoriesCtl.text
                              .split(',')
                              .map((s) => s.trim())
                              .where((s) => s.isNotEmpty)
                              .toList();
                          final categories = [...selectedCategories, ...extra];
                          final address = addressCtl.text.trim();
                          final radius = int.tryParse(radiusCtl.text) ?? 500;
                          setState(() => loading = true);
                          try {
                            final client = PersistentClient();
                            final uri = Uri.parse(
                              'http://10.0.2.2:3001/labour/profile',
                            );
                            final res = await client.post(
                              uri,
                              headers: {'Content-Type': 'application/json'},
                              body: jsonEncode({
                                'skill_type': selectedSkill,
                                'role': 'LABOUR',
                                'categories': categories,
                                'address': address,
                                'travel_radius_meters': radius,
                              }),
                            );
                            if (res.statusCode == 200) {
                              final data =
                                  jsonDecode(res.body) as Map<String, dynamic>;
                              ref.read(currentUserProvider.notifier).state =
                                  data;
                              if (mounted) Navigator.of(ctx).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Profile saved')),
                              );
                            } else {
                              throw Exception('Save failed: ${res.body}');
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Save failed: $e')),
                              );
                            }
                          } finally {
                            setState(() => loading = false);
                          }
                        },
                  child: loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    _maybeShowProfileModal();
    final theme = Theme.of(context);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Map preview (placeholder) showing nearby geofences; tappable to open project list/map
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12),
            child: GestureDetector(
              onTap: () {
                // open first site or a list - for now open first site if present
                if (_nearbySites.isNotEmpty) _openProject(_nearbySites.first);
              },
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.map, size: 48, color: Color(0xFF00BF6D)),
                    const SizedBox(height: 8),
                    Text(
                      'Live map preview',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${_nearbySites.length} nearby sites',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    // simple visual markers
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 8,
                      children: _nearbySites
                          .map(
                            (s) => Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.9),
                                shape: BoxShape.circle,
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Registry preview: nearby sites horizontally
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text('Nearby Sites', style: theme.textTheme.titleMedium),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 140,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              scrollDirection: Axis.horizontal,
              itemCount: _nearbySites.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, idx) {
                final s = _nearbySites[idx];
                return GestureDetector(
                  onTap: () => _openProject(s),
                  child: Container(
                    width: 260,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s['name'],
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          s['address'],
                          style: theme.textTheme.bodySmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Spacer(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${s['distance']} m',
                              style: theme.textTheme.bodySmall,
                            ),
                            ElevatedButton(
                              onPressed: () => _openProject(s),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF00BF6D),
                              ),
                              child: const Text('View'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 18),
          // Offline banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              vertical: 8.0,
              horizontal: 12.0,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF4E5),
              borderRadius: BorderRadius.circular(8.0),
              border: Border.all(color: const Color(0xFFF2D9B8)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.wifi_off, size: 18, color: Color(0xFFB06A00)),
                SizedBox(width: 8),
                Text(
                  'Offline Mode - Data will sync later',
                  style: TextStyle(color: Color(0xFFB06A00)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          // Greeting row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Good Morning, Ramesh!',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '25-10-2023 · Site A',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey[700],
                      ),
                    ),
                  ],
                ),
              ),
              const CircleAvatar(
                radius: 20,
                backgroundColor: Color(0xFFFFE6CC),
                child: Text(
                  'RK',
                  style: TextStyle(
                    color: Color(0xFF7A4A00),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          // Card
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14.0),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              children: [
                // Top blue zone area
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24.0),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEAF6FF),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(14),
                      topRight: Radius.circular(14),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 70,
                        height: 70,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.03),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: Center(
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: const BoxDecoration(
                              color: Color(0xFF00BF6D),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.place,
                              color: Colors.white,
                              size: 22,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Inside Geo-fence Zone',
                        style: TextStyle(
                          color: Color(0xFF2B6EAF),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                // White content area
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16.0,
                    vertical: 16.0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FFF4),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: const Color(0xFFE6F6EA),
                              ),
                            ),
                            child: Row(
                              children: const [
                                Icon(
                                  Icons.check_circle,
                                  color: Color(0xFF00BF6D),
                                  size: 16,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'Location Verified',
                                  style: TextStyle(
                                    color: Color(0xFF0B8D47),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'You\'re at the site!',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your location has been detected within the geo-fence boundary.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[700],
                        ),
                      ),
                      const SizedBox(height: 18),
                      // Info boxes
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _infoBox('SITE', 'Oberoi Sky City'),
                          _infoBox('ZONE', 'Block A'),
                          _infoBox('CHECK-IN TIME', '08:15 AM'),
                          _infoBox(
                            'STATUS',
                            'Awaiting\nApproval',
                            highlight: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          // Pending verification notice
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14.0),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFF5E1B8)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2.0),
                  child: Icon(Icons.info_outline, color: Color(0xFFB06A00)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pending Verification',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Your Site Engineer will verify your entry. Once approved, your attendance will be recorded.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey[800],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _infoBox(String title, String value, {bool highlight = false}) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              color: Colors.grey,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: highlight ? const Color(0xFFB45A00) : Colors.black,
            ),
          ),
        ],
      ),
    );
  }
}

/// Full-screen wrapper that embeds the content inside `AppLayout`.
class LabourDashboardScreen extends StatelessWidget {
  const LabourDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppLayout(title: '', child: LabourDashboardContent());
  }
}
