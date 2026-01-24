import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:convert';

import '../../theme/app_colors.dart';
import '../../services/persistent_client.dart';
import '../../config.dart';
import '../../providers/user_provider.dart';

class LabourDashboardDetail extends ConsumerStatefulWidget {
  final Map<String, dynamic>? site;
  const LabourDashboardDetail({super.key, this.site});

  @override
  ConsumerState<LabourDashboardDetail> createState() =>
      _LabourDashboardDetailState();
}

class _LabourDashboardDetailState extends ConsumerState<LabourDashboardDetail> {
  bool _loading = false;

  Future<void> _apply() async {
    setState(() => _loading = true);
    final user = ref.read(currentUserProvider);
    final Map<String, dynamic>? userMap = user as Map<String, dynamic>?;
    final labour = (userMap != null && userMap.containsKey('labour'))
        ? userMap['labour'] as Map<String, dynamic>?
        : userMap;
    final labourId = labour != null
        ? (labour['id'] ?? labour['labour_id'])
        : null;
    if (labourId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No labour id available')));
      setState(() => _loading = false);
      return;
    }

    final client = PersistentClient();
    try {
      final uri = Uri.parse(API_BASE_URL + '/labour/apply');
      final body = jsonEncode({
        'site_id': widget.site?['id'],
        'labour_id': labourId,
      });
      final res = await client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: body,
      );
      if (res.statusCode == 200) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Apply request sent')));
        Navigator.of(context).pop(true);
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Apply failed: ${res.body}')));
      }
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Apply failed: $e')));
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final site = widget.site;
    final siteName = site?['name']?.toString() ?? 'Site Details';
    final zone =
        site?['address']?.toString() ?? site?['zone']?.toString() ?? '';
    final checkIn = site?['check_in_time']?.toString() ?? '—';
    final status = site?['status']?.toString() ?? '';

    final payoutsMap = <String, String>{};
    if (site != null) {
      if (site!['payouts'] is Map) {
        (site!['payouts'] as Map).forEach((k, v) {
          payoutsMap[k.toString()] = v?.toString() ?? '-';
        });
      } else {
        payoutsMap['Electrical Engineer'] =
            site?['payout_electrical']?.toString() ?? '-';
        payoutsMap['Skilled'] = site?['payout_skilled']?.toString() ?? '-';
        payoutsMap['Semi Skilled'] =
            site?['payout_semi_skilled']?.toString() ?? '-';
      }
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Back button (sub-screen, no app bar)
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),

            // Header: show site title instead of geo-fence for recent/available sites
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    siteName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (zone.isNotEmpty)
                    Text(zone, style: const TextStyle(color: Colors.black54)),
                ],
              ),
            ),

            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Site Information',
                        style: TextStyle(color: Colors.green),
                      ),
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: Colors.orange,
                        child: const Text('RK'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    site?['description']?.toString() ?? '',
                    style: const TextStyle(color: Colors.black87),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: _InfoTile(label: 'SITE', value: siteName),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _InfoTile(label: 'ZONE', value: zone),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _InfoTile(
                          label: 'CHECK-IN TIME',
                          value: checkIn,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _InfoTile(
                          label: 'STATUS',
                          value: status.isNotEmpty ? status : 'Available',
                          valueColor: status.isNotEmpty
                              ? Colors.orange
                              : Colors.green,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Payouts section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 6,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Payouts',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  if (payoutsMap.isEmpty)
                    const Text(
                      'No payout data available',
                      style: TextStyle(color: Colors.black54),
                    )
                  else
                    ...payoutsMap.entries.map((e) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              e.key,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              e.value,
                              style: const TextStyle(color: Colors.black87),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Apply button for recent/available site
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF7643),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: _loading ? null : _apply,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text('Apply'),
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _InfoTile({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.black54, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
