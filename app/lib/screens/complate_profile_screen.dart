import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/user_provider.dart';
import '../providers/auth_providers.dart';
import '../theme/app_colors.dart';

class ComplateProfileScreen extends ConsumerStatefulWidget {
  const ComplateProfileScreen({super.key});

  @override
  ConsumerState<ComplateProfileScreen> createState() =>
      _ComplateProfileScreenState();
}

class _ComplateProfileScreenState extends ConsumerState<ComplateProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _skillType;
  final TextEditingController _categoriesCtrl = TextEditingController();
  final TextEditingController _addressCtrl = TextEditingController();
  bool _loading = false;
  List<Map<String, dynamic>> _suggestions = [];
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    if (user == null) {
      // not authenticated -> go to login
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/login');
      });
      return;
    }

    // Prefill fields if backend already has values (we only show null ones but keep values for convenience)
    if (user['categories'] != null) {
      if (user['categories'] is List) {
        _categoriesCtrl.text = (user['categories'] as List).join(', ');
      } else {
        _categoriesCtrl.text = user['categories'].toString();
      }
    }
    if (user['address'] != null) {
      _addressCtrl.text = user['address'] as String;
    }

    // If nothing is missing, go straight to dashboard
    final needs =
        (user['skill_type'] == null) ||
        (user['categories'] == null) ||
        (user['address'] == null);
    if (!needs) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/labour-dashboard');
      });
    }
  }

  @override
  void dispose() {
    _categoriesCtrl.dispose();
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
    _debounce = Timer(
      const Duration(milliseconds: 300),
      () => _fetchAddressSuggestions(v),
    );
  }

  Future<void> _fetchAddressSuggestions(String q) async {
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': q,
        'format': 'json',
        'addressdetails': '1',
        'limit': '5',
      });
      final res = await http.get(
        uri,
        headers: {'User-Agent': 'bharatbuild-client/1.0 (you@example.com)'},
      );
      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
        final list = data
            .map((e) {
              return {
                'display_name': e['display_name'],
                'lat': e['lat'],
                'lon': e['lon'],
              };
            })
            .toList(growable: false);
        if (mounted)
          setState(() => _suggestions = List<Map<String, dynamic>>.from(list));
      }
    } catch (e) {
      // ignore network errors for autocomplete
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final payload = <String, dynamic>{};
    if (_skillType != null && _skillType!.isNotEmpty)
      payload['skill_type'] = _skillType;
    if (_categoriesCtrl.text.trim().isNotEmpty) {
      // send categories as array
      final list = _categoriesCtrl.text
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      payload['categories'] = list;
    }
    if (_addressCtrl.text.trim().isNotEmpty)
      payload['address'] = _addressCtrl.text.trim();

    if (payload.isEmpty) {
      Navigator.pushReplacementNamed(context, '/labour-dashboard');
      return;
    }

    setState(() => _loading = true);
    try {
      final auth = ref.read(authServiceProvider);
      final updated = await auth.updateLabourProfile(payload);
      if (updated != null) {
        ref.read(currentUserProvider.notifier).state = updated;
      }
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/labour-dashboard');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Save failed: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text(
          'Sign up',
          style: TextStyle(color: Color(0xFF757575)),
        ),
        foregroundColor: AppColors.primary,
      ),
      body: SafeArea(
        child: SizedBox(
          width: double.infinity,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SingleChildScrollView(
              child: Column(
                children: [
                  const SizedBox(height: 16),
                  const Text(
                    'Complete Profile',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Complete your details or continue \nwith social media',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF757575)),
                  ),
                  SizedBox(height: MediaQuery.of(context).size.height * 0.05),

                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        // Skill type - show only if null
                        if (user != null && user['skill_type'] == null) ...[
                          DropdownButtonFormField<String>(
                            value: _skillType,
                            items: const [
                              DropdownMenuItem(
                                value: 'SKILLED',
                                child: Text('Skilled'),
                              ),
                              DropdownMenuItem(
                                value: 'SEMI_SKILLED',
                                child: Text('Semi-skilled'),
                              ),
                              DropdownMenuItem(
                                value: 'UNSKILLED',
                                child: Text('Unskilled'),
                              ),
                            ],
                            decoration: const InputDecoration(
                              labelText: 'Skill type',
                            ),
                            onChanged: (v) => setState(() => _skillType = v),
                            validator: (v) => v == null || v.isEmpty
                                ? 'Select skill type'
                                : null,
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Categories - show only if null
                        if (user != null && user['categories'] == null) ...[
                          TextFormField(
                            controller: _categoriesCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Categories (comma separated)',
                            ),
                            validator: (v) => v == null || v.trim().isEmpty
                                ? 'Enter at least one category'
                                : null,
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Address - show only if null
                        if (user != null && user['address'] == null) ...[
                          TextFormField(
                            controller: _addressCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Address',
                            ),
                            onChanged: _onAddressChanged,
                            validator: (v) => v == null || v.trim().isEmpty
                                ? 'Enter address'
                                : null,
                          ),
                          // suggestions
                          if (_suggestions.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Container(
                              constraints: const BoxConstraints(maxHeight: 200),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black12,
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                              child: ListView.builder(
                                shrinkWrap: true,
                                itemCount: _suggestions.length,
                                itemBuilder: (context, idx) {
                                  final s = _suggestions[idx];
                                  return ListTile(
                                    title: Text(s['display_name'] ?? ''),
                                    onTap: () {
                                      _addressCtrl.text =
                                          s['display_name'] ?? '';
                                      setState(() => _suggestions = []);
                                    },
                                  );
                                },
                              ),
                            ),
                            const SizedBox(height: 16),
                          ] else
                            const SizedBox(height: 16),
                        ],

                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            elevation: 0,
                            backgroundColor: const Color(0xFFFF7643),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 48),
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.all(
                                Radius.circular(16),
                              ),
                            ),
                          ),
                          child: _loading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Continue'),
                        ),
                      ],
                    ),
                  ),

                  SizedBox(height: MediaQuery.of(context).size.height * 0.15),
                  const Text(
                    'By continuing your confirm that you agree \nwith our Term and Condition',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF757575)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
