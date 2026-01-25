import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
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
    
    // Check role from user object, but fallback to reasonable defaults
    final String rawRole = user?['role']?.toString().toUpperCase() ?? '';
    final bool isEngineer = rawRole == 'ENGINEER' || rawRole == 'SITE_ENGINEER' || rawRole == 'MANAGER';
    final bool isQaEngineer = rawRole == 'QA_ENGINEER';
    
    // If the user object is null but we are on an engineer screen, 
    // we should try to maintain the engineer layout.
    // However, the cleanest way is to ensure currentUserProvider is never null 
    // during a refresh (which profileProvider now handles).

    final List<BottomNavigationBarItem> items;

    if (isQaEngineer) {
      items = [
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            homeIcon,
            colorFilter: const ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
          ),
          activeIcon: SvgPicture.string(
            homeIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'home'.tr(),
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
              : 'profile'.tr(),
        ),
      ];
    } else {
      items = [
      BottomNavigationBarItem(
        icon: SvgPicture.string(
          homeIcon,
          colorFilter: const ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
        ),
        activeIcon: SvgPicture.string(
          homeIcon,
          colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
        ),
        label: 'home'.tr(),
      ),
      if (isEngineer)
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            briefcaseIcon,
            colorFilter: const ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
          ),
          activeIcon: SvgPicture.string(
            briefcaseIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'projects'.tr(),
        )
      else
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            briefcaseIcon,
            colorFilter: const ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
          ),
          activeIcon: SvgPicture.string(
            briefcaseIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'my_jobs'.tr(),
        ),
      if (isEngineer)
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            chartIcon,
            colorFilter: const ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
          ),
          activeIcon: SvgPicture.string(
            chartIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'reports'.tr(),
        )
      else
        BottomNavigationBarItem(
          icon: SvgPicture.string(
            chartIcon,
            colorFilter: const ColorFilter.mode(inActiveIconColor, BlendMode.srcIn),
          ),
          activeIcon: SvgPicture.string(
            chartIcon,
            colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.srcIn),
          ),
          label: 'earnings'.tr(),
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
            : 'profile'.tr(),
      ),
    ];
    }

    return BottomNavigationBar(
      onTap: updateCurrentIndex,
      currentIndex: currentIndex >= items.length ? 0 : currentIndex,
      showSelectedLabels: false,
      showUnselectedLabels: false,
      type: BottomNavigationBarType.fixed,
      items: items,
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

const briefcaseIcon =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>''';

const chartIcon = 
    '''<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>''';
