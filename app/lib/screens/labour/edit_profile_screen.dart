import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/user_provider.dart';
import '../../providers/auth_providers.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _roleCtrl;
  late final TextEditingController _skillTypeCtrl;
  late final TextEditingController _newCategoryCtrl;
  final List<String> _presetCategories = [
    'Electrical',
    'Civil',
    'Plumbing',
    'Masonry',
    'Carpentry',
  ];
  final Set<String> _selectedCategories = {};
  String? _selectedSkillType;
  List<Map<String, String>> _addressSuggestions = [];
  bool _loadingSuggestions = false;
  Timer? _debounce;
  double? _selectedLatitude;
  double? _selectedLongitude;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);

    _nameCtrl = TextEditingController(text: user?['name']?.toString() ?? '');
    _phoneCtrl = TextEditingController(text: user?['phone']?.toString() ?? '');
    _addressCtrl = TextEditingController(
      text: user?['address']?.toString() ?? '',
    );
    _roleCtrl = TextEditingController(text: user?['role']?.toString() ?? '');
    _skillTypeCtrl = TextEditingController(
      text: user?['skill_type']?.toString() ?? '',
    );
    _newCategoryCtrl = TextEditingController();
    _selectedSkillType = user?['skill_type']?.toString();
    // initialize selected categories from user data
    final categoriesRaw = user?['categories'];
    if (categoriesRaw is List) {
      for (final c in categoriesRaw) {
        if (c != null) _selectedCategories.add(c.toString());
      }
    } else if (categoriesRaw != null) {
      final cats = categoriesRaw.toString().split(',').map((s) => s.trim());
      for (final c in cats) {
        if (c.isNotEmpty) _selectedCategories.add(c);
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _roleCtrl.dispose();
    _skillTypeCtrl.dispose();
    _newCategoryCtrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        title: const Text('Edit Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const ProfilePic(image: 'https://i.postimg.cc/cCsYDjvj/user-2.png'),

            _EditFieldCard(
              label: 'Skill Type',
              child: DropdownButtonFormField<String>(
                value: _selectedSkillType,
                decoration: const InputDecoration(border: InputBorder.none),
                items: const [
                  DropdownMenuItem(value: 'SKILLED', child: Text('Skilled')),
                  DropdownMenuItem(
                    value: 'SEMI_SKILLED',
                    child: Text('Semi Skilled'),
                  ),
                  DropdownMenuItem(
                    value: 'UNSKILLED',
                    child: Text('Unskilled'),
                  ),
                ],
                onChanged: (v) => setState(() => _selectedSkillType = v),
              ),
            ),

            _EditFieldCard(
              label: 'Categories',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _presetCategories.map((cat) {
                      final selected = _selectedCategories.contains(cat);
                      return FilterChip(
                        label: Text(cat),
                        selected: selected,
                        onSelected: (v) {
                          setState(() {
                            if (v) {
                              _selectedCategories.add(cat);
                            } else {
                              _selectedCategories.remove(cat);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    children: _selectedCategories.map((c) {
                      return Chip(
                        label: Text(c),
                        onDeleted: () =>
                            setState(() => _selectedCategories.remove(c)),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _newCategoryCtrl,
                          decoration: const InputDecoration(
                            hintText: 'Add category',
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () {
                          final v = _newCategoryCtrl.text.trim();
                          if (v.isEmpty) return;
                          setState(() {
                            _selectedCategories.add(v);
                            _newCategoryCtrl.clear();
                          });
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),

            _EditFieldCard(
              label: 'Address',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _addressCtrl,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: 'Start typing address or pick below',
                          ),
                          onChanged: (v) {
                            _debounce?.cancel();
                            _debounce = Timer(
                              const Duration(milliseconds: 400),
                              () {
                                _searchAddress(v);
                              },
                            );
                            // clear selected coords when user edits
                            _selectedLatitude = null;
                            _selectedLongitude = null;
                          },
                        ),
                      ),
                      IconButton(
                        tooltip: 'Use current location',
                        icon: const Icon(Icons.my_location),
                        onPressed: _useCurrentLocation,
                      ),
                    ],
                  ),
                  if (_loadingSuggestions) const LinearProgressIndicator(),
                  ..._addressSuggestions.map((s) {
                    return ListTile(
                      dense: true,
                      title: Text(s['display_name'] ?? ''),
                      subtitle: Text('${s['lat']}, ${s['lon']}'),
                      onTap: () {
                        setState(() {
                          _addressCtrl.text = s['display_name'] ?? '';
                          _selectedLatitude = double.tryParse(s['lat'] ?? '');
                          _selectedLongitude = double.tryParse(s['lon'] ?? '');
                          _addressSuggestions = [];
                        });
                      },
                    );
                  }).toList(),
                ],
              ),
            ),

            const SizedBox(height: 20),

            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                SizedBox(
                  width: 120,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  width: 160,
                  child: ElevatedButton(
                    onPressed: _saveProfile,
                    child: const Text('Save Update'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _saveProfile() {
    final updated = <String, dynamic>{
      'name': _nameCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim(),
      'address': _addressCtrl.text.trim(),
      'role': _roleCtrl.text.trim(),
      'skill_type': _selectedSkillType ?? _skillTypeCtrl.text.trim(),
      'categories': _selectedCategories.toList(),
    };
    if (_selectedLatitude != null && _selectedLongitude != null) {
      updated['primary_latitude'] = _selectedLatitude;
      updated['primary_longitude'] = _selectedLongitude;
    }

    final auth = ref.read(authServiceProvider);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    auth
        .updateLabourProfile(updated)
        .then((labour) {
          Navigator.pop(context);

          if (labour != null) {
            ref.read(currentUserProvider.notifier).state = labour;
          }

          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Profile updated')));

          Navigator.pop(context);
        })
        .catchError((e) {
          Navigator.pop(context);
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Save failed: $e')));
        });
  }

  Future<void> _searchAddress(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _addressSuggestions = [];
      });
      return;
    }

    setState(() {
      _loadingSuggestions = true;
    });

    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': query,
        'format': 'json',
        'limit': '6',
      });
      final res = await http.get(
        uri,
        headers: {'User-Agent': 'bharatbuild-app/1.0 (contact@example.com)'},
      );
      if (res.statusCode == 200) {
        final List<dynamic> data = res.body.isEmpty
            ? []
            : (jsonDecode(res.body) as List);
        setState(() {
          _addressSuggestions = data.map<Map<String, String>>((e) {
            return {
              'display_name': e['display_name']?.toString() ?? '',
              'lat': e['lat']?.toString() ?? '',
              'lon': e['lon']?.toString() ?? '',
            };
          }).toList();
        });
      }
    } catch (_) {
      // ignore
    } finally {
      setState(() {
        _loadingSuggestions = false;
      });
    }
  }

  Future<void> _useCurrentLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.denied) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location permission denied')),
        );
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      _selectedLatitude = pos.latitude;
      _selectedLongitude = pos.longitude;

      // reverse geocode via Nominatim
      final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
        'lat': pos.latitude.toString(),
        'lon': pos.longitude.toString(),
        'format': 'json',
      });
      final res = await http.get(
        uri,
        headers: {'User-Agent': 'bharatbuild-app/1.0 (contact@example.com)'},
      );
      if (res.statusCode == 200) {
        final Map<String, dynamic> body =
            jsonDecode(res.body) as Map<String, dynamic>;
        final display = body['display_name']?.toString() ?? '';
        setState(() {
          _addressCtrl.text = display;
          _addressSuggestions = [];
        });
      } else {
        setState(() {});
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Location failed: $e')));
    }
  }
}

class ProfilePic extends StatelessWidget {
  const ProfilePic({super.key, required this.image});
  final String image;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: Theme.of(context).dividerColor.withOpacity(0.12),
        ),
      ),
      child: CircleAvatar(radius: 50, backgroundImage: NetworkImage(image)),
    );
  }
}

class _EditFieldCard extends StatelessWidget {
  const _EditFieldCard({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 6),
            child,
          ],
        ),
      ),
    );
  }
}
