import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/organization_provider.dart';
import '../../theme/app_colors.dart';

class MyOrganizationsScreen extends ConsumerWidget {
  const MyOrganizationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myRequestsAsync = ref.watch(myOrgRequestsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('my_organizations'.tr()),
        actions: [
          IconButton(
            onPressed: () => Navigator.pushNamed(context, '/engineer-organization'),
            icon: const Icon(Icons.add),
            tooltip: 'join_new_org'.tr(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(myOrgRequestsProvider.future),
        child: myRequestsAsync.when(
          data: (requests) {
            if (requests.isEmpty) {
              return _buildEmptyState(context);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: requests.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final req = requests[index];
                return _OrgRequestCard(request: req);
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Error: $err')),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.business_outlined, size: 64, color: Colors.grey.withOpacity(0.5)),
          const SizedBox(height: 16),
          Text('no_organizations_joined'.tr()),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, '/engineer-organization'),
            child: Text('join_organization'.tr()),
          ),
        ],
      ),
    );
  }
}

class _OrgRequestCard extends StatelessWidget {
  final dynamic request;
  const _OrgRequestCard({required this.request});

  @override
  Widget build(BuildContext context) {
    final status = (request['status'] ?? 'PENDING').toString().toUpperCase();
    Color statusColor = Colors.orange;
    if (status == 'APPROVED') statusColor = Colors.green;
    if (status == 'REJECTED') statusColor = Colors.red;

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
        title: Text(
          request['name'] ?? 'Untitled Organization',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(request['address'] ?? ''),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                status.tr(),
                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
