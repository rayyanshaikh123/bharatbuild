import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import 'edit_profile_screen.dart';
import 'tools_screen.dart';
import '../../providers/user_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    final displayName =
        user != null && user['name'] != null ? user['name'] as String : 'Your name';

    

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        title: const Text('Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
  child: Column(
    children: [
      ProfilePic(
        image: user != null && user['avatar'] != null
            ? user['avatar'] as String
            : 'https://i.postimg.cc/cCsYDjvj/user-2.png',
      ),
      const SizedBox(height: 8),
      Text(
        displayName,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
      ),
    ],
  ),
),

            const SizedBox(height: 20),

            /// BASIC INFO
            _InfoCard(
              title: 'Phone',
              value: user != null && user['phone'] != null
                  ? user['phone'] as String
                  : '-',
              icon: Icons.phone_outlined,
            ),
           

            const SizedBox(height: 12),

            /// WORK INFO
            _InfoCard(
              title: 'Role',
              value: user != null && user['role'] != null
                  ? (user['role'] as String).toUpperCase()
                  : '-',
              icon: Icons.badge_outlined,
            ),
            _InfoCard(
              title: 'Skill Type',
              value: user != null && user['skill_type'] != null
                  ? user['skill_type'] as String
                  : '-',
              icon: Icons.work_outline,
            ),
            _InfoCard(
              title: 'Categories',
              value: user != null && user['categories'] != null
                  ? (user['categories'] is List
                      ? (user['categories'] as List).join(', ')
                      : user['categories'].toString())
                  : '-',
              icon: Icons.category_outlined,
            ),
            _InfoCard(
              title: 'Travel Radius (m)',
              value: user != null && user['travel_radius_meters'] != null
                  ? user['travel_radius_meters'].toString()
                  : '-',
              icon: Icons.directions_walk,
            ),
            _InfoCard(
              title: 'Primary Location',
              value: user != null && user['primary_latitude'] != null
                  ? '${user['primary_latitude']}, ${user['primary_longitude']}'
                  : 'Not set',
              icon: Icons.place_outlined,
            ),
            _InfoCard(
              title: 'Address',
              value: user != null && user['address'] != null
                  ? user['address'] as String
                  : '-',
              icon: Icons.location_on_outlined,
            ),

            const SizedBox(height: 12),

            /// TOOLS BUTTON
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              color: AppColors.card,
              child: ListTile(
                leading: Icon(Icons.construction, color: AppColors.primary),
                title: Text('Tools Management'),
                subtitle: Text('Scan QR codes to issue/return tools'),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const LabourToolsScreen(),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 12),

            /// EDIT BUTTON
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const EditProfileScreen(),
                      ),
                    );
                  },
                  child: const Text('Edit profile'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class ProfilePic extends StatelessWidget {
  const ProfilePic({super.key, required this.image});

  final String image;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: Theme.of(context).dividerColor.withOpacity(0.2),
        ),
      ),
      child: CircleAvatar(
        radius: 50,
        backgroundImage: NetworkImage(image),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    super.key,
    required this.title,
    required this.value,
    this.icon,
  });

  final String title;
  final String value;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: AppColors.card,
      child: ListTile(
        leading: icon != null ? Icon(icon, color: AppColors.primary) : null,
        title: Text(
          title,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: AppColors.mutedForeground),
        ),
        subtitle: Text(value, style: Theme.of(context).textTheme.bodyLarge),
      ),
    );
  }
}
