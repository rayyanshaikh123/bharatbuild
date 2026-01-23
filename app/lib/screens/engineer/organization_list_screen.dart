import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/organization_provider.dart';
import '../../theme/app_colors.dart';

class OrganizationListScreen extends ConsumerWidget {
  const OrganizationListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final allOrgsAsync = ref.watch(allOrganizationsProvider);
    final myRequestsAsync = ref.watch(myOrgRequestsProvider);
    final currentOrgAsync = ref.watch(currentOrgProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('organization'.tr()),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(currentOrgProvider);
          ref.invalidate(allOrganizationsProvider);
          ref.invalidate(myOrgRequestsProvider);
        },
        child: currentOrgAsync.when(
          data: (currentOrg) {
            if (currentOrg != null) {
              return _buildCurrentOrgInfo(context, currentOrg);
            }
            return _buildOrganizationList(context, ref, allOrgsAsync, myRequestsAsync);
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Error: $err')),
        ),
      ),
    );
  }

  Widget _buildCurrentOrgInfo(BuildContext context, Map<String, dynamic> org) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24.0),
      child: Container(
        height: MediaQuery.of(context).size.height - 100, // Ensure it fills screen to be scrollable
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.business, size: 80, color: AppColors.primary),
            const SizedBox(height: 24),
            Text(
              org['name'] ?? 'Your Organization',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              org['address'] ?? 'Address not available',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  Text('approved_org'.tr(), style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrganizationList(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<List<dynamic>> allOrgs,
    AsyncValue<List<dynamic>> myRequests,
  ) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            'join_org_desc'.tr(),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
        Expanded(
          child: allOrgs.when(
            data: (orgs) {
              if (orgs.isEmpty) {
                return const Center(child: Text('No organizations found'));
              }
              return ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: orgs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final org = orgs[index];
                  final orgId = org['id'].toString();
                  
                  final request = myRequests.maybeWhen(
                    data: (reqs) => reqs.cast<Map<String, dynamic>>().firstWhere(
                      (r) => r['id'].toString() == orgId,
                      orElse: () => <String, dynamic>{},
                    ),
                    orElse: () => <String, dynamic>{},
                  );

                  final status = request['status'];

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: AppColors.primary,
                          child: Icon(Icons.business, color: Colors.white),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(org['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text(org['address'] ?? '', style: Theme.of(context).textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                        if (status == null)
                          ElevatedButton(
                            onPressed: () => ref.read(joinOrganizationProvider(orgId)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Text('apply_now'.tr()),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _getStatusColor(status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              status.toString().toUpperCase(),
                              style: TextStyle(color: _getStatusColor(status), fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, _) => Center(child: Text('Error: $err')),
          ),
        ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved': return Colors.green;
      case 'rejected': return Colors.red;
      default: return Colors.orange;
    }
  }
}
