import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/user_provider.dart';
import '../../providers/auth_providers.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _roleCtrl;
  late final TextEditingController _skillTypeCtrl;
  late final TextEditingController _categoriesCtrl;
  late final TextEditingController _travelRadiusCtrl;
  late final TextEditingController _latitudeCtrl;
  late final TextEditingController _longitudeCtrl;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);

    _nameCtrl = TextEditingController(text: user?['name']?.toString() ?? '');
    _phoneCtrl = TextEditingController(text: user?['phone']?.toString() ?? '');
    _addressCtrl = TextEditingController(text: user?['address']?.toString() ?? '');
    _roleCtrl = TextEditingController(text: user?['role']?.toString() ?? '');
    _skillTypeCtrl = TextEditingController(text: user?['skill_type']?.toString() ?? '');
    _categoriesCtrl = TextEditingController(
      text: user?['categories'] is List
          ? (user!['categories'] as List).join(', ')
          : user?['categories']?.toString() ?? '',
    );
    _travelRadiusCtrl =
        TextEditingController(text: user?['travel_radius_meters']?.toString() ?? '');
    _latitudeCtrl =
        TextEditingController(text: user?['primary_latitude']?.toString() ?? '');
    _longitudeCtrl =
        TextEditingController(text: user?['primary_longitude']?.toString() ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _roleCtrl.dispose();
    _skillTypeCtrl.dispose();
    _categoriesCtrl.dispose();
    _travelRadiusCtrl.dispose();
    _latitudeCtrl.dispose();
    _longitudeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        title: const Text('Edit Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const ProfilePic(
              image: 'https://i.postimg.cc/cCsYDjvj/user-2.png',
            ),

            _EditFieldCard(
              label: 'Name',
              child: TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Phone',
              child: TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Role',
              child: TextFormField(
                controller: _roleCtrl,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Skill Type',
              child: TextFormField(
                controller: _skillTypeCtrl,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Categories (comma separated)',
              child: TextFormField(
                controller: _categoriesCtrl,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Travel Radius (meters)',
              child: TextFormField(
                controller: _travelRadiusCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Latitude',
              child: TextFormField(
                controller: _latitudeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Longitude',
              child: TextFormField(
                controller: _longitudeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            _EditFieldCard(
              label: 'Address',
              child: TextFormField(
                controller: _addressCtrl,
                decoration: const InputDecoration(border: InputBorder.none),
              ),
            ),

            const SizedBox(height: 20),

            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                SizedBox(
                  width: 120,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  width: 160,
                  child: ElevatedButton(
                    onPressed: _saveProfile,
                    child: const Text('Save Update'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _saveProfile() {
    final updated = <String, dynamic>{
      'name': _nameCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim(),
      'address': _addressCtrl.text.trim(),
      'role': _roleCtrl.text.trim(),
      'skill_type': _skillTypeCtrl.text.trim(),
      'categories': _categoriesCtrl.text
          .split(',')
          .map((e) => e.trim())
          .toList(),
      'travel_radius_meters': int.tryParse(_travelRadiusCtrl.text.trim()),
      'primary_latitude': double.tryParse(_latitudeCtrl.text.trim()),
      'primary_longitude': double.tryParse(_longitudeCtrl.text.trim()),
    };

    final auth = ref.read(authServiceProvider);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    auth.updateLabourProfile(updated).then((labour) {
      Navigator.pop(context);

      if (labour != null) {
        ref.read(currentUserProvider.notifier).state = labour;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated')),
      );

      Navigator.pop(context);
    }).catchError((e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Save failed: $e')),
      );
    });
  }
}

class ProfilePic extends StatelessWidget {
  const ProfilePic({super.key, required this.image});
  final String image;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.12)),
      ),
      child: CircleAvatar(radius: 50, backgroundImage: NetworkImage(image)),
    );
  }
}

class _EditFieldCard extends StatelessWidget {
  const _EditFieldCard({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 6),
            child,
          ],
        ),
      ),
    );
  }
}
