import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/app_config_provider.dart';
import '../../providers/user_provider.dart';
import '../../providers/auth_providers.dart';
import '../../theme/app_colors.dart';

class AccountSettingsScreen extends ConsumerWidget {
  const AccountSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final themeMode = ref.watch(themeProvider);
    final currentLocale = context.locale;
    
    // Primary source of truth: local cached user data (Optimistic UI)
    final user = ref.watch(currentUserProvider);

    // Trigger background refresh, but don't block UI on it
    ref.listen(profileProvider, (_, __) {});
    final profileAsync = ref.watch(profileProvider);

    // Only show full-screen loader if we have NO data at all
    if (user == null) {
      if (profileAsync.isLoading) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      return const Scaffold(body: Center(child: Text("Failed to load profile")));
    }

    final profile = user;
    final isPushEnabled = profile['push_notifications_enabled'] ?? true;
    final isEmailEnabled = profile['email_notifications_enabled'] ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text('account_settings'.tr()),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 10),
          
          // Language Section
          _buildSectionHeader(context, 'language'.tr()),
          const SizedBox(height: 12),
          _buildSettingCard(
            context,
            icon: Icons.language,
            title: 'language'.tr(),
            subtitle: currentLocale.languageCode == 'en' ? 'english'.tr() : 'hindi'.tr(),
            onTap: () => _showLanguageDialog(context),
          ),
          const SizedBox(height: 24),

          // Theme Section
          _buildSectionHeader(context, 'theme'.tr()),
          const SizedBox(height: 12),
          _buildSettingCard(
            context,
            icon: Icons.palette_outlined,
            title: 'theme'.tr(),
            subtitle: themeMode == ThemeMode.dark ? 'dark_mode'.tr() : 'light_mode'.tr(),
            trailing: Switch(
              value: themeMode == ThemeMode.dark,
              onChanged: (value) {
                ref.read(themeProvider.notifier).state =
                    value ? ThemeMode.dark : ThemeMode.light;
              },
              activeColor: AppColors.primary,
            ),
          ),
          const SizedBox(height: 24),

          // Notifications Section
          _buildSectionHeader(context, 'notifications'.tr()),
          const SizedBox(height: 12),
          _buildSettingCard(
            context,
            icon: Icons.notifications_outlined,
            title: 'push_notifications'.tr(),
            subtitle: 'receive_updates_alerts'.tr(),
            trailing: Switch(
              value: isPushEnabled,
              onChanged: (value) async {
                _updateSettings(ref, {'push_notifications_enabled': value});
              },
              activeColor: AppColors.primary,
            ),
          ),
          const SizedBox(height: 12),
          _buildSettingCard(
            context,
            icon: Icons.email_outlined,
            title: 'email_notifications'.tr(),
            subtitle: 'receive_email_updates'.tr(),
            trailing: Switch(
              value: isEmailEnabled,
              onChanged: (value) async {
                _updateSettings(ref, {'email_notifications_enabled': value});
              },
              activeColor: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _updateSettings(WidgetRef ref, Map<String, dynamic> payload) async {
    try {
      final auth = ref.read(authServiceProvider);
      // Optimistic update locally first? 
      // For now, allow server response to drive update via setUser
      final updated = await auth.updateEngineerProfile(payload);
      if (updated != null) {
        ref.read(currentUserProvider.notifier).setUser(updated);
        // Do NOT invalidate profileProvider here as it would trigger a re-fetch loop with the old structure.
        // Since we updated currentUserProvider, the UI updates automatically.
      }
    } catch (e) {
      debugPrint('Failed to update settings: $e');
      ScaffoldMessenger.of(ref.context).showSnackBar(
        SnackBar(content: Text('Update failed: $e')),
      );
    }
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
    );
  }

  Widget _buildSettingCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    final theme = Theme.of(context);
    
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primary, size: 24),
        ),
        title: Text(
          title,
          style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          subtitle,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
        trailing: trailing ??
            Icon(
              Icons.arrow_forward_ios,
              size: 16,
              color: theme.colorScheme.onSurface.withOpacity(0.3),
            ),
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('select_language'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text('english'.tr()),
              leading: Radio<String>(
                value: 'en',
                groupValue: context.locale.languageCode,
                onChanged: (value) {
                  context.setLocale(const Locale('en'));
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: Text('hindi'.tr()),
              leading: Radio<String>(
                value: 'hi',
                groupValue: context.locale.languageCode,
                onChanged: (value) {
                  context.setLocale(const Locale('hi'));
                  Navigator.pop(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
