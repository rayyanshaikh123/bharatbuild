import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:http/http.dart' as http;
import '../../providers/address_provider.dart';
import '../../providers/user_provider.dart';

class AddressManagementScreen extends ConsumerWidget {
  const AddressManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addressesAsync = ref.watch(addressesProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('manage_addresses'.tr()),
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddAddressDialog(context, ref),
        label: Text('add_address'.tr()),
        icon: const Icon(Icons.add),
      ),
      body: addressesAsync.when(
        data: (addresses) {
          if (addresses.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.location_off_outlined, size: 64, color: theme.colorScheme.onSurface.withOpacity(0.2)),
                  const SizedBox(height: 16),
                  Text('no_addresses'.tr(), style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.5))),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: addresses.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final addr = addresses[index];
              return _AddressCard(address: addr);
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('error'.tr() + ': $err')),
      ),
    );
  }

  void _showAddAddressDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => const _AddAddressSheet(),
    );
  }
}

class _AddressCard extends ConsumerWidget {
  final dynamic address;
  const _AddressCard({required this.address});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isPrimary = address['is_primary'] == true;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isPrimary ? theme.colorScheme.primary : theme.colorScheme.outline.withOpacity(0.1), width: isPrimary ? 2 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_on, color: isPrimary ? theme.colorScheme.primary : theme.colorScheme.onSurface.withOpacity(0.5)),
              const SizedBox(width: 8),
              Text(
                address['tag']?.toString().toUpperCase() ?? 'OTHER',
                style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold, letterSpacing: 1),
              ),
              if (isPrimary) ...[
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: theme.colorScheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text('primary'.tr(), style: TextStyle(color: theme.colorScheme.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          Text(address['address_text'], style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          _AddressActionRow(address: address, isPrimary: isPrimary),
        ],
      ),
    );
  }
}

class _AddressActionRow extends StatefulWidget {
  final dynamic address;
  final bool isPrimary;
  const _AddressActionRow({required this.address, required this.isPrimary});

  @override
  State<_AddressActionRow> createState() => _AddressActionRowState();
}

class _AddressActionRowState extends State<_AddressActionRow> {
  bool _isDeleting = false;
  bool _isSettingPrimary = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Consumer(builder: (context, ref, _) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          if (_isDeleting)
            const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
          else
            TextButton.icon(
              onPressed: _isSettingPrimary ? null : () async {
                setState(() => _isDeleting = true);
                try {
                  await ref.read(deleteAddressProvider(widget.address['id'].toString()).future);
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('address_deleted'.tr())));
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('error'.tr() + ': $e')));
                } finally {
                  if (mounted) setState(() => _isDeleting = false);
                }
              },
              icon: const Icon(Icons.delete_outline, size: 18),
              label: Text('delete'.tr()),
              style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
            ),
          const SizedBox(width: 8),
          if (!widget.isPrimary)
            if (_isSettingPrimary)
              const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
            else
              TextButton.icon(
                onPressed: _isDeleting ? null : () async {
                  setState(() => _isSettingPrimary = true);
                  try {
                    await ref.read(setPrimaryAddressProvider(widget.address['id'].toString()).future);
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('primary_address_updated'.tr())));
                  } catch (e) {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('error'.tr() + ': $e')));
                  } finally {
                    if (mounted) setState(() => _isSettingPrimary = false);
                  }
                },
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: Text('set_primary'.tr()),
              ),
        ],
      );
    });
  }
}

class _AddAddressSheet extends ConsumerStatefulWidget {
  const _AddAddressSheet();

  @override
  ConsumerState<_AddAddressSheet> createState() => _AddAddressSheetState();
}

class _AddAddressSheetState extends ConsumerState<_AddAddressSheet> {
  final _addressCtrl = TextEditingController();
  final _tagCtrl = TextEditingController(text: 'Home');
  bool _loading = false;
  List<Map<String, dynamic>> _suggestions = [];
  Timer? _debounce;
  double? _lat;
  double? _lon;

  void _onAddressChanged(String v) {
    _debounce?.cancel();
    if (v.trim().isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 500), () => _fetchSuggestions(v));
  }

  Future<void> _fetchSuggestions(String q) async {
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
    if (_addressCtrl.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      await ref.read(addAddressProvider({
        'address_text': _addressCtrl.text.trim(),
        'tag': _tagCtrl.text.trim(),
        'latitude': _lat,
        'longitude': _lon,
        'is_primary': false,
      }).future);
      await ref.read(profileProvider.future);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('error'.tr() + ': $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('add_new_address'.tr(), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          TextField(
            controller: _tagCtrl,
            decoration: InputDecoration(labelText: 'tag'.tr(), hintText: 'e.g. Home, Work'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _addressCtrl,
            onChanged: _onAddressChanged,
            decoration: InputDecoration(labelText: 'address'.tr(), prefixIcon: const Icon(Icons.search)),
          ),
          if (_suggestions.isNotEmpty)
            Container(
              constraints: const BoxConstraints(maxHeight: 200),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _suggestions.length,
                itemBuilder: (context, index) {
                  final s = _suggestions[index];
                  return ListTile(
                    title: Text(s['display_name'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                    onTap: () {
                      _addressCtrl.text = s['display_name'] ?? '';
                      _lat = double.tryParse(s['lat']?.toString() ?? '');
                      _lon = double.tryParse(s['lon']?.toString() ?? '');
                      setState(() => _suggestions = []);
                    },
                  );
                },
              ),
            ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _loading ? null : _submit,
            style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 56)),
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : Text('save'.tr()),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
