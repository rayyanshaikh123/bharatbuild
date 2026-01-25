import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/qa_provider.dart';
import '../../providers/auth_providers.dart';

class QAProfileContent extends ConsumerWidget {
  const QAProfileContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(qaProfileProvider);

    return profileAsync.when(
        data: (data) {
          // Robust null check for user data
          // Ensure we have a valid map, otherwise render error or fallback
          if (data == null) {
             return const Center(child: Text("Profile not found"));
          }
          final user = data;

          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 48),
                const CircleAvatar(
                  radius: 50,
                  backgroundColor: Colors.blueAccent,
                  // Ensure no null passed to widgets if possible
                  child: Icon(Icons.person, size: 50, color: Colors.white),
                ),
                const SizedBox(height: 24),
                Text(
                  user['name']?.toString() ?? 'Unknown Name',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  user['email']?.toString() ?? '',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Text(
                  user['phone']?.toString() ?? '',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.grey),
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      try {
                        await ref.read(authServiceProvider).logoutQAEngineer();
                        if (context.mounted) {
                           Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                        }
                      } catch (e) {
                        if (context.mounted) {
                           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Logout failed: $e")));
                        }
                      }
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text("Logout"),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: Colors.red),
                      foregroundColor: Colors.red,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
        error: (err, stack) => Center(child: Text("Error loading profile: $err")),
        loading: () => const Center(child: CircularProgressIndicator()),
    );
  }
}
