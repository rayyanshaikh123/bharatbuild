import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:http/http.dart' as http;
import '../providers/user_provider.dart';
import '../providers/auth_providers.dart';
import '../theme/app_colors.dart';

class CompleteProfileScreen extends ConsumerStatefulWidget {
  final bool isEditing;
  const CompleteProfileScreen({super.key, this.isEditing = false});

  @override
  ConsumerState<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends ConsumerState<CompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _skillType;
  final List<String> _selectedTrades = [];
  final TextEditingController _addressCtrl = TextEditingController();
  bool _loading = false;
  List<Map<String, dynamic>> _suggestions = [];
  Timer? _debounce;
  double? _lat;
  double? _lon;

  final List<Map<String, String>> _tradesList = [
    {'id': 'mason', 'name': 'trade_mason'},
    {'id': 'electrician', 'name': 'trade_electrician'},
    {'id': 'plumber', 'name': 'trade_plumber'},
    {'id': 'carpenter', 'name': 'trade_carpenter'},
    {'id': 'painter', 'name': 'trade_painter'},
    {'id': 'welder', 'name': 'trade_welder'},
    {'id': 'bar_bender', 'name': 'trade_bar_bender'},
    {'id': 'tile_layer', 'name': 'trade_tile_layer'},
    {'id': 'helper', 'name': 'trade_helper'},
  ];

  @override
  void initState() {
    super.initState();
    _checkInitialState();
  }

  void _checkInitialState() {
    final user = ref.read(currentUserProvider);
    if (user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/login');
      });
      return;
    }

    final userData = (user is Map && user.containsKey('labour')) ? user['labour'] : user;

    if (userData['skill_type'] != null) _skillType = userData['skill_type'];
    if (userData['categories'] != null && userData['categories'] is List) {
      _selectedTrades.addAll((userData['categories'] as List).cast<String>());
    }
    if (userData['address'] != null) _addressCtrl.text = userData['address'];
    if (userData['primary_latitude'] != null) _lat = double.tryParse(userData['primary_latitude'].toString());
    if (userData['primary_longitude'] != null) _lon = double.tryParse(userData['primary_longitude'].toString());

    // Only auto-redirect if NOT in editing mode
    if (!widget.isEditing) {
      final needs = (userData['skill_type'] == null) || (userData['categories'] == null) || (userData['address'] == null);
      if (!needs) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.pushReplacementNamed(context, '/labour-dashboard');
        });
      }
    }
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onAddressChanged(String v) {
    _debounce?.cancel();
    if (v.trim().isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 500), () => _fetchAddressSuggestions(v));
  }

  Future<void> _fetchAddressSuggestions(String q) async {
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': q,
        'format': 'json',
        'addressdetails': '1',
        'limit': '5',
        'countrycodes': 'in',
      });
      final res = await http.get(uri, headers: {'User-Agent': 'bharatbuild/1.0'});
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _suggestions = data.map((e) => {
              'display_name': e['display_name'],
              'lat': e['lat'],
              'lon': e['lon'],
            }).toList();
          });
        }
      }
    } catch (e) {}
  }

  Future<void> _submit() async {
    if (_skillType == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('select_skill_type'.tr())));
      return;
    }
    if (_selectedTrades.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('select_trades'.tr())));
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    final payload = {
      'skill_type': _skillType,
      'categories': _selectedTrades,
      'address': _addressCtrl.text.trim(),
      'primary_latitude': _lat,
      'primary_longitude': _lon,
    };

    setState(() => _loading = true);
    try {
      final auth = ref.read(authServiceProvider);
      final updated = await auth.updateLabourProfile(payload);
      if (updated != null) {
        ref.read(currentUserProvider.notifier).state = updated;
      }
      if (!mounted) return;
      
      if (widget.isEditing) {
        Navigator.pop(context);
      } else {
        Navigator.pushReplacementNamed(context, '/labour-dashboard');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('error'.tr() + ': $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'edit_profile'.tr() : 'complete_profile'.tr()),
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'complete_profile_desc'.tr(),
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.6)),
                ),
                const SizedBox(height: 32),
                
                // Skill Type Selection
                Text('skill_type'.tr(), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildSkillCard('SKILLED', 'skilled'.tr(), Icons.star),
                    const SizedBox(width: 12),
                    _buildSkillCard('SEMI_SKILLED', 'semi_skilled'.tr(), Icons.star_half),
                    const SizedBox(width: 12),
                    _buildSkillCard('UNSKILLED', 'unskilled'.tr(), Icons.star_outline),
                  ],
                ),
                const SizedBox(height: 32),
                
                // Trades Selection
                Text('trades'.tr(), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _tradesList.map((trade) {
                    final isSelected = _selectedTrades.contains(trade['id']);
                    return FilterChip(
                      label: Text(trade['name']!.tr()),
                      selected: isSelected,
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedTrades.add(trade['id']!);
                          } else {
                            _selectedTrades.remove(trade['id']);
                          }
                        });
                      },
                      selectedColor: theme.colorScheme.primary.withOpacity(0.2),
                      checkmarkColor: theme.colorScheme.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSelected ? theme.colorScheme.primary : theme.colorScheme.outline.withOpacity(0.3),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 32),
                
                // Address Autocomplete
                Text('address'.tr(), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _addressCtrl,
                  onChanged: _onAddressChanged,
                  decoration: InputDecoration(
                    hintText: 'enter_address'.tr(),
                    prefixIcon: const Icon(Icons.location_on_outlined),
                  ),
                  validator: (v) => (v ?? '').isEmpty ? 'required'.tr() : null,
                ),
                if (_suggestions.isNotEmpty) _buildSuggestionsList(theme),
                
                const SizedBox(height: 48),
                ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                  ),
                  child: _loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(widget.isEditing ? 'update'.tr() : 'save_profile'.tr()),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSkillCard(String value, String label, IconData icon) {
    final theme = Theme.of(context);
    final isSelected = _skillType == value;
    
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _skillType = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? theme.colorScheme.primary.withOpacity(0.1) : theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? theme.colorScheme.primary : theme.colorScheme.outline.withOpacity(0.2),
              width: 2,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface.withOpacity(0.5)),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSuggestionsList(ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _suggestions.length,
        separatorBuilder: (context, index) => Divider(height: 1, color: theme.colorScheme.outline.withOpacity(0.1)),
        itemBuilder: (context, index) {
          final s = _suggestions[index];
          return ListTile(
            leading: const Icon(Icons.place_outlined, size: 20),
            title: Text(s['display_name'] ?? '', style: theme.textTheme.bodyMedium),
            onTap: () {
              _addressCtrl.text = s['display_name'] ?? '';
              _lat = double.tryParse(s['lat']?.toString() ?? '');
              _lon = double.tryParse(s['lon']?.toString() ?? '');
              setState(() => _suggestions = []);
            },
          );
        },
      ),
    );
  }
}
