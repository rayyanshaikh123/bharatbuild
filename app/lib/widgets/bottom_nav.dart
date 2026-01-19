import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/user_provider.dart';
import '../providers/navigation_provider.dart';
import '../theme/app_colors.dart';

const Color inActiveIconColor = AppColors.inactiveIcon;

class BottomNavBar extends ConsumerStatefulWidget {
  const BottomNavBar({super.key});

  @override
  ConsumerState<BottomNavBar> createState() => _BottomNavBarState();
}

class _BottomNavBarState extends ConsumerState<BottomNavBar> {
  void updateCurrentIndex(int index) {
    // update provider-controlled index for IndexedStack
    ref.read(bottomNavIndexProvider.notifier).state = index;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final currentIndex = ref.watch(bottomNavIndexProvider);
    return BottomNavigationBar(
      onTap: updateCurrentIndex,
      currentIndex: currentIndex,
      showSelectedLabels: false,
      showUnselectedLabels: false,
      type: BottomNavigationBarType.fixed,
      items: [
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            homeIcon,
            colorFilter: ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
          ),
          activeIcon: SvgPicture.string(
            homeIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            heartIcon,
            colorFilter: const ColorFilter.mode(
              inActiveIconColor,
              BlendMode.srcIn,
            ),
          ),
          activeIcon: SvgPicture.string(
            heartIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'Tasks',
        ),
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            mapIcon,
            colorFilter: ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
          ),
          activeIcon: SvgPicture.string(
            mapIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'Map',
        ),
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            chatIcon,
            colorFilter: const ColorFilter.mode(
              inActiveIconColor,
              BlendMode.srcIn,
            ),
          ),
          activeIcon: SvgPicture.string(
            chatIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'Attendance',
        ),
        BottomNavigationBarItem(
          icon: Stack(
            alignment: Alignment.center,
            children: [
              SvgPicture.string(
                userIcon,
                colorFilter: const ColorFilter.mode(
                  inActiveIconColor,
                  BlendMode.srcIn,
                ),
              ),
              if (user != null && user['name'] != null)
                Positioned(
                  right: -6,
                  top: -6,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 8,
                      minHeight: 8,
                    ),
                  ),
                ),
            ],
          ),
          activeIcon: SvgPicture.string(
            userIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: user != null && user['name'] != null
              ? (user['name'] as String).split(' ').first
              : 'Profile',
        ),
      ],
    );
  }
}

// Simple full SVG icon strings (using paths compatible with SvgPicture.string)
const homeIcon =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>''';

const heartIcon =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 22l8.8-9.6a5.5 5.5 0 0 0 0-7.8z"/></svg>''';

const chatIcon =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>''';

const userIcon =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>''';

const mapIcon =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 11-9 11S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="2"/></svg>''';
