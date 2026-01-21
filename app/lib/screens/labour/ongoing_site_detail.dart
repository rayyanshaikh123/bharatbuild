import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';

class OngoingSiteDetail extends ConsumerStatefulWidget {
  final Map<String, dynamic> site;
  const OngoingSiteDetail({super.key, required this.site});

  @override
  ConsumerState<OngoingSiteDetail> createState() => _OngoingSiteDetailState();
}

class _OngoingSiteDetailState extends ConsumerState<OngoingSiteDetail> {
  @override
  Widget build(BuildContext context) {
    final site = widget.site;
    final siteName = site['name'] as String? ?? 'Site';
    final zone = site['zone'] as String? ?? site['address'] as String? ?? '';
    final checkIn = site['check_in_time'] as String? ?? '—';
    final status = site['status'] as String? ?? 'Ongoing';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Back button
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),

              // Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: const [
                    Icon(Icons.location_on, size: 48, color: Colors.green),
                    SizedBox(height: 8),
                    Text(
                      'Inside Geo-fence Zone',
                      style: TextStyle(
                        color: Colors.blue,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Card with details
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
                        Text(
                          'Location Verified',
                          style: TextStyle(color: Colors.green.shade700),
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
                      siteName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      site['description']?.toString() ?? '',
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
                            value: status,
                            valueColor: Colors.orange,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.info_outline, color: Colors.orange),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Pending Verification\nYour Site Engineer will verify your entry. Once approved, your attendance will be recorded.',
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

// Single _InfoTile implementation (defined above)

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
