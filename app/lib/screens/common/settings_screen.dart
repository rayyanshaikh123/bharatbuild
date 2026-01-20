import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/app_config_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('settings'.tr()),
      ),
      body: ListView(
        children: [
          // Theme Setting
          ListTile(
            title: Text('theme'.tr()),
            subtitle: Text(themeMode == ThemeMode.dark ? 'dark_mode'.tr() : 'light_mode'.tr()),
            trailing: Switch(
              value: themeMode == ThemeMode.dark,
              onChanged: (value) {
                ref.read(themeProvider.notifier).toggleTheme();
              },
            ),
          ),
          const Divider(),
          // Language Setting
          ListTile(
            title: Text('language'.tr()),
            subtitle: Text(context.locale.languageCode == 'en' ? 'english'.tr() : 'hindi'.tr()),
            trailing: PopupMenuButton<String>(
              onSelected: (String result) {
                if (result == 'en') {
                  context.setLocale(const Locale('en'));
                } else if (result == 'hi') {
                  context.setLocale(const Locale('hi'));
                }
              },
              itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                const PopupMenuItem<String>(
                  value: 'en',
                  child: Text('English'),
                ),
                const PopupMenuItem<String>(
                  value: 'hi',
                  child: Text('हिंदी (Hindi)'),
                ),
              ],
            ),
          ),
          const Divider(),
        ],
      ),
    );
  }
}
