import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_theme.dart';
import '../providers/app_config_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../offline_sync/sync_service.dart';

class AppHeader extends ConsumerWidget implements PreferredSizeWidget {
  final String title;
  const AppHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final theme = Theme.of(context);
    final foreground = theme.brightness == Brightness.dark ? Colors.white : AppColors.foreground;

    return AppBar(
      title: Row(
        children: [
          Image.asset(
            themeMode == ThemeMode.dark ? 'assets/images/logo_dark.png' : 'assets/images/bharatbuild_logo.png',
            height: 32,
          ),
        ],
      ),
      elevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: foreground,
      centerTitle: false,
      automaticallyImplyLeading: false,
      actions: [
        IconButton(
          tooltip: 'Sync Data',
          onPressed: () async {
            try {
              final count = await ref.read(syncServiceProvider).performManualSync();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$count items synced successfully'), backgroundColor: Colors.green),
                );
              }
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Sync failed: $e'), backgroundColor: Colors.red),
                );
              }
            }
          },
          icon: const Icon(Icons.sync_outlined),
        ),
        IconButton(
          tooltip: 'Notifications',
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
          icon: const Icon(Icons.notifications_outlined),
        ),
        IconButton(
          tooltip: 'Toggle Theme',
          onPressed: () => ref.read(themeProvider.notifier).toggleTheme(),
          icon: Icon(
            themeMode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode,
          ),
        ),
        const SizedBox(width: 8),
      ],
      flexibleSpace: Container(
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          border: Border(bottom: BorderSide(color: AppColors.border.withOpacity(0.5))),
        ),
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class WebCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? status;
  final VoidCallback? onTap;
  const WebCard({
    super.key,
    required this.title,
    this.subtitle,
    this.onTap,
    this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: const Color.fromRGBO(2, 6, 23, 0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.work, color: AppColors.foreground),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                          fontSize: 15,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            color: AppColors.mutedForeground,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (status != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: StatusBadge(status: status!),
                  ),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  Color _bg(String s) {
    switch (s.toUpperCase()) {
      case 'ACTIVE':
        return AppColors.success.withOpacity(0.08);
      case 'DELAYED':
        return AppColors.danger.withOpacity(0.06);
      case 'COMPLETE':
        return AppColors.info.withOpacity(0.06);
      case 'PENDING':
        return AppColors.pending.withOpacity(0.06);
      case 'APPROVED':
        return AppColors.primary.withOpacity(0.06);
      default:
        return Colors.grey.withOpacity(0.08);
    }
  }

  Color _fg(String s) {
    switch (s.toUpperCase()) {
      case 'ACTIVE':
        return AppColors.success;
      case 'DELAYED':
        return AppColors.danger;
      case 'COMPLETE':
        return AppColors.info;
      case 'PENDING':
        return AppColors.pending;
      case 'APPROVED':
        return AppColors.primary;
      default:
        return AppColors.mutedForeground;
    }
  }

  @override
  Widget build(BuildContext context) {
    final upper = status.toUpperCase();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _bg(status),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: _fg(status).withOpacity(0.12)),
      ),
      child: Text(
        upper,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: _fg(status),
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.open_in_new),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        elevation: 18,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        shadowColor: AppColors.primary.withOpacity(0.18),
      ),
    );
  }
}
