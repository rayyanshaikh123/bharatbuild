import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../widgets/app_ui.dart';
import '../widgets/bottom_nav.dart';
import '../providers/navigation_provider.dart';
import '../screens/labour/mobile_pages.dart';
import '../screens/labour/operation_zones_home.dart';
import '../providers/current_project_provider.dart';
import '../providers/user_provider.dart';
import '../widgets/project_gate.dart';

/// AppLayout provides a two-column layout (sidebar + content) inspired by
/// the web frontend. Intended to be swapped to `gluestack_ui_flutter`
/// primitives later — currently uses Material widgets for safety.
class AppLayout extends ConsumerWidget {
  final String title;
  final Widget child;
  final List<Widget>? mobilePages;

  const AppLayout({
    super.key,
    required this.title,
    required this.child,
    this.mobilePages,
  });
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 800;
        final sidebar = Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFF07102A).withOpacity(0.98),
                const Color(0xFF03121E).withOpacity(0.95),
              ],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'BharatBuild',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              SizedBox(height: 18),
              _NavItem(icon: Icons.dashboard, label: 'Dashboard'),
              SizedBox(height: 8),
              _NavItem(icon: Icons.engineering, label: 'Engineer Flow'),
              SizedBox(height: 8),
              _NavItem(icon: Icons.group, label: 'Labour Flow'),
            ],
          ),
        );

        if (isNarrow) {
          final idx = ref.watch(bottomNavIndexProvider);
          final pages =
              mobilePages ??
              [
                const OperationZonesHome(),
                const ApplicationsContent(),
                const ProfileContent(),
              ];

          final user = ref.watch(currentUserProvider);
          final role = user?['role']?.toString().toUpperCase() ?? 'LABOUR';
          final selectedProject = ref.watch(currentProjectProvider);
          final isEngineer = role == 'SITE_ENGINEER' || role == 'ENGINEER' || role == 'MANAGER';

          return Scaffold(
            appBar: AppHeader(title: title),
            bottomNavigationBar: const BottomNavBar(),
            body: IndexedStack(
              index: idx,
              children: pages.asMap().entries.map((entry) {
                final pageIdx = entry.key;
                final page = entry.value;

                // Profile and jobs/organization list might be allowed without project
                // But generally, the user wants it on "each and every page"
                // Let's exempt the profile page (usually last) for safety
                // Profile is the last tab for both Labour (4 tabs) and Engineer (4 tabs)
                final isProfile = pageIdx == 3;
                final isEngineerProfile = pageIdx == 3 && isEngineer;
                
                if (isEngineer && !isEngineerProfile && selectedProject == null) {
                   return const ProjectGate(child: SizedBox.shrink());
                }

                return page;
              }).toList(),
            ),
          );
        }

        return Scaffold(
          appBar: AppHeader(title: title),
          body: Row(
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 260, minWidth: 200),
                child: sidebar,
              ),
              Expanded(
                child: Container(
                  color: Theme.of(context).colorScheme.background,
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: child,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  const _NavItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      child: Row(
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 12),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
