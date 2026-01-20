import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'empty_notifications_screen.dart';
import '../providers/user_provider.dart';
import './complete_profile_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final theme = Theme.of(context);

    // Support both direct user map or {labour: {...}} wrap
    final userData = (user != null && user.containsKey('labour')) ? user['labour'] : user;
    final skillType = userData?['skill_type'] ?? 'Not set';
    final categories = (userData?['categories'] as List?)?.join(', ') ?? 'No trades selected';
    final address = userData?['address'] ?? 'Address not set';

    return Scaffold(
      appBar: AppBar(
        title: Text('profile'.tr()),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(refreshUserProvider.future),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
        child: Column(
          children: [
            const ProfilePic(),
            const SizedBox(height: 12),
            Text(
              userData?['name'] ?? 'Guest User',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              userData?['phone'] ?? '',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.6)),
            ),
            const SizedBox(height: 32),
            
            // Stats/Details Section
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
              ),
              child: Column(
                children: [
                  _infoRow(context, 'skill_type'.tr(), skillType),
                  const Divider(height: 32),
                  _infoRow(context, 'trades'.tr(), categories),
                  const Divider(height: 32),
                  _infoRow(context, 'address'.tr(), address),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            ProfileMenu(
              text: "edit_profile".tr(),
              icon: "assets/icons/User Icon.svg",
              press: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CompleteProfileScreen(isEditing: true)),
              ),
            ),
            ProfileMenu(
              text: "manage_addresses".tr(),
              icon: "assets/icons/Location point.svg",
              press: () => Navigator.pushNamed(context, '/addresses'),
            ),
            ProfileMenu(
              text: "notifications".tr(),
              icon: "assets/icons/Bell.svg",
              press: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const EmptyNotificationsScreen(),
                  ),
                );
              },
            ),
            ProfileMenu(
              text: "settings".tr(),
              icon: "assets/icons/Settings.svg",
              press: () => Navigator.pushNamed(context, '/settings'),
            ),
          ],
        ),
      ),
    ),
  );
}

Widget _infoRow(BuildContext context, String label, String value) {
  final theme = Theme.of(context);
  return Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(
        flex: 2,
        child: Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
        ),
      ),
      Expanded(
        flex: 3,
        child: Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    ],
  );
}
}

class ProfilePic extends StatelessWidget {
  const ProfilePic({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 115,
      width: 115,
      child: Stack(
        fit: StackFit.expand,
        clipBehavior: Clip.none,
        children: [
          const CircleAvatar(
            backgroundImage: NetworkImage(
              "https://i.postimg.cc/0jqKB6mS/Profile-Image.png",
            ),
          ),
          Positioned(
            right: -16,
            bottom: 0,
            child: SizedBox(
              height: 46,
              width: 46,
              child: TextButton(
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(50),
                    side: BorderSide(color: Theme.of(context).scaffoldBackgroundColor),
                  ),
                  backgroundColor: Theme.of(context).colorScheme.surface,
                ),
                onPressed: () {},
                child: SvgPicture.string(cameraIcon),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ProfileMenu extends StatelessWidget {
  const ProfileMenu({
    Key? key,
    required this.text,
    required this.icon,
    this.press,
  }) : super(key: key);

  final String text, icon;
  final VoidCallback? press;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: TextButton(
        style: TextButton.styleFrom(
          foregroundColor: theme.colorScheme.primary,
          padding: const EdgeInsets.all(20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
          backgroundColor: theme.colorScheme.surface,
        ),
        onPressed: press,
        child: Row(
          children: [
            const Icon(Icons.settings_display_outlined), // Placeholder for SVG if not available
            const SizedBox(width: 20),
            Expanded(
              child: Text(
                text,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.8),
                ),
              ),
            ),
            Icon(Icons.arrow_forward_ios, color: theme.colorScheme.onSurface.withOpacity(0.5), size: 16),
          ],
        ),
      ),
    );
  }
}

const cameraIcon =
    '''<svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M10 12.0152C8.49151 12.0152 7.26415 10.8137 7.26415 9.33902C7.26415 7.86342 8.49151 6.6619 10 6.6619C11.5085 6.6619 12.7358 7.86342 12.7358 9.33902C12.7358 10.8137 11.5085 12.0152 10 12.0152ZM10 5.55543C7.86698 5.55543 6.13208 7.25251 6.13208 9.33902C6.13208 11.4246 7.86698 13.1217 10 13.1217C12.133 13.1217 13.8679 11.4246 13.8679 9.33902C13.8679 7.25251 12.133 5.55543 10 5.55543ZM18.8679 13.3967C18.8679 14.2226 18.1811 14.8935 17.3368 14.8935H2.66321C1.81887 14.8935 1.13208 14.2226 1.13208 13.3967V5.42346C1.13208 4.59845 1.81887 3.92664 2.66321 3.92664H4.75C5.42453 3.92664 6.03396 3.50952 6.26604 2.88753L6.81321 1.41746C6.88113 1.23198 7.06415 1.10739 7.26604 1.10739H12.734C12.9358 1.10739 13.1189 1.23198 13.1877 1.41839L13.734 2.88845C13.966 3.50952 14.5755 3.92664 15.25 3.92664H17.3368C18.1811 3.92664 18.8679 4.59845 18.8679 5.42346V13.3967ZM17.3368 2.82016H15.25C15.0491 2.82016 14.867 2.69466 14.7972 2.50917L14.2519 1.04003C14.0217 0.418041 13.4113 0 12.734 0H7.26604C6.58868 0 5.9783 0.418041 5.74906 1.0391L5.20283 2.50825C5.13302 2.69466 4.95094 2.82016 4.75 2.82016H2.66321C1.19434 2.82016 0 3.98846 0 5.42346V13.3967C0 14.8326 1.19434 16 2.66321 16H17.3368C18.8057 16 20 14.8326 20 13.3967V5.42346C20 3.98846 18.8057 2.82016 17.3368 2.82016Z" fill="#757575"/>
</svg>''';
