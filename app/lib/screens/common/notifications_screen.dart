import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../theme/app_colors.dart';

import '../../providers/user_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/auth_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final isEngineer = user?['role'] == 'SITE_ENGINEER';
    final notificationsAsync = ref.watch(isEngineer ? engineerNotificationsProvider : labourNotificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('notifications'.tr()),
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () async {
              try {
                if (isEngineer) {
                  await ref.read(authServiceProvider).markEngineerNotificationsRead();
                  ref.invalidate(engineerNotificationsProvider);
                } else {
                  await ref.read(authServiceProvider).markLabourNotificationsRead();
                  ref.invalidate(labourNotificationsProvider);
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: Text(
              'mark_all_read'.tr(),
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) {
            return _buildEmptyState(context);
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(engineerNotificationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: notifications.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final notification = notifications[index];
                
                // Map backend fields to UI format
                final mapped = {
                  'id': notification['id'],
                  'title': notification['title'],
                  'message': notification['message'],
                  'time': _formatTime(notification['created_at']),
                  'icon': _getIconForType(notification['type']),
                  'color': _getColorForType(notification['type']),
                  'read': notification['is_read'] ?? false,
                };
                
                return _buildNotificationCard(context, ref, mapped);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  String _formatTime(String? createdAt) {
    if (createdAt == null) return '';
    final dt = DateTime.parse(createdAt);
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return DateFormat('dd MMM').format(dt);
  }

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'SUCCESS': return Icons.check_circle;
      case 'WARNING': return Icons.warning;
      case 'ERROR': return Icons.error;
      case 'JOB': return Icons.work_outline;
      default: return Icons.notifications_none;
    }
  }

  Color _getColorForType(String? type) {
    switch (type) {
      case 'SUCCESS': return Colors.green;
      case 'WARNING': return Colors.orange;
      case 'ERROR': return Colors.red;
      case 'JOB': return Colors.blue;
      default: return Colors.blue;
    }
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.notifications_none,
              size: 64,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'no_notifications'.tr(),
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'notifications_appear_here'.tr(),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(BuildContext context, WidgetRef ref, Map<String, dynamic> notification) {
    final theme = Theme.of(context);
    final isRead = notification['read'] as bool;

    return Container(
      decoration: BoxDecoration(
        color: isRead
            ? theme.colorScheme.surface
            : theme.colorScheme.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isRead
              ? theme.colorScheme.outline.withOpacity(0.1)
              : AppColors.primary.withOpacity(0.2),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: (notification['color'] as Color).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            notification['icon'] as IconData,
            color: notification['color'] as Color,
            size: 24,
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                notification['title'] as String,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            if (!isRead)
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              notification['message'] as String,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              notification['time'] as String,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.4),
              ),
            ),
          ],
        ),
        onTap: () async {
          if (!isRead) {
            try {
              if (isEngineer) {
                await ref.read(authServiceProvider).markEngineerNotificationRead(notification['id']);
                ref.invalidate(engineerNotificationsProvider);
              } else {
                await ref.read(authServiceProvider).markLabourNotificationRead(notification['id']);
                ref.invalidate(labourNotificationsProvider);
              }
            } catch (_) {}
          }
        },
      ),
    );
  }
}
