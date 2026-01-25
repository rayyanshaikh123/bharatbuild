import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/qa_provider.dart';
import '../../theme/app_colors.dart';

class QAOrganizationListScreen extends ConsumerWidget {
  const QAOrganizationListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final allOrgsAsync = ref.watch(qaAllOrganizationsProvider);
    final myRequestsAsync = ref.watch(qaMyOrgRequestsProvider);
    final currentOrgAsync = ref.watch(qaCurrentOrgProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('organization'.tr()),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(qaCurrentOrgProvider);
          ref.invalidate(qaAllOrganizationsProvider);
          ref.invalidate(qaMyOrgRequestsProvider);
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
                   Icon(Icons.check_circle, color: Colors.green, size: 20),
                   SizedBox(width: 8),
                  Text('Approved Member', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
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
                return Center(child: Text('no_organizations_found'.tr()));
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: orgs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final org = orgs[index];
                  // Check status
                  String? status;
                  if (myRequests.hasValue) {
                     final req = myRequests.value!.firstWhere(
                       (r) => r['id'] == org['id'],
                       orElse: () => null,
                     );
                     if (req != null) status = req['status'];
                  }
                  
                  return _OrgCard(org: org, status: status);
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
}

class _OrgCard extends ConsumerStatefulWidget {
  final dynamic org;
  final String? status;
  const _OrgCard({required this.org, this.status});

  @override
  ConsumerState<_OrgCard> createState() => _OrgCardState();
}

class _OrgCardState extends ConsumerState<_OrgCard> {
  bool _isLoading = false;

  Future<void> _join() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(qaServiceProvider).joinOrganization(widget.org['id']);
      ref.invalidate(qaMyOrgRequestsProvider);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('request_sent'.tr())));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    bool isPending = widget.status == 'PENDING';
    bool isApproved = widget.status == 'APPROVED'; // Should not happen here if currentOrgProvider manages state correctly, but safe to have.
    bool canRequest = widget.status == null;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withOpacity(0.1)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withOpacity(0.1),
          child: const Icon(Icons.business, color: AppColors.primary),
        ),
        title: Text(widget.org['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(widget.org['address'] ?? ''),
        trailing: _isLoading 
            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
            : isPending 
                ? Text('pending'.tr(), style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold))
                : isApproved
                  ? const Icon(Icons.check_circle, color: Colors.green)
                  : ElevatedButton(
                      onPressed: _join,
                      child: Text('join'.tr()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                    ),
      ),
    );
  }
}
