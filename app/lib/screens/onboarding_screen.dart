import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_colors.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int currentPage = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),

            /// Pages
            Expanded(
              flex: 14,
              child: PageView.builder(
                itemCount: demoData.length,
                onPageChanged: (value) {
                  setState(() {
                    currentPage = value;
                  });
                },
                itemBuilder: (context, index) {
                  final item = demoData[index];

                  if (item["type"] == "language") {
                    return const LanguageOnboard();
                  }

                  return OnboardContent(
                    illustration: item["illustration"],
                    title: (item["title"] as String).tr(),
                    text: (item["text"] as String).tr(),
                  );
                },
              ),
            ),

            const Spacer(),

            /// Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                demoData.length,
                (index) => DotIndicator(isActive: index == currentPage),
              ),
            ),

            const Spacer(flex: 2),

            /// Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ElevatedButton(
                onPressed: () {
                  if (currentPage < demoData.length - 1) {
                    setState(() {
                      currentPage++;
                    });
                  } else {
                    Navigator.pushReplacementNamed(
                      context,
                      '/login',
                      arguments: {
                        'role': 'labour',
                      },
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 56),
                ),
                child: Text(
                  currentPage == demoData.length - 1
                      ? "CONTINUE".tr()
                      : "NEXT".tr(),
                ),
              ),
            ),

            const Spacer(),
          ],
        ),
      ),
    );
  }
}

class LanguageOnboard extends StatelessWidget {
  const LanguageOnboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Spacer(),
        Icon(Icons.language, size: 80, color: Theme.of(context).colorScheme.primary.withOpacity(0.8)),
        const SizedBox(height: 32),

        Text(
          "language".tr(),
          style: Theme.of(context)
              .textTheme
              .titleLarge!
              .copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        Text(
          "select_language_desc".tr(),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 48),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: DropdownButtonFormField<String>(
            value: context.locale.languageCode,
            items: const [
              DropdownMenuItem(value: "en", child: Text("English")),
              DropdownMenuItem(value: "hi", child: Text("हिंदी (Hindi)")),
              DropdownMenuItem(value: "ta", child: Text("தமிழ் (Tamil)")),
              DropdownMenuItem(value: "gu", child: Text("ગુજરાતી (Gujarati)")),
              DropdownMenuItem(value: "mr", child: Text("मराठी (Marathi)")),
            ],
            onChanged: (value) {
              if (value != null) {
                context.setLocale(Locale(value));
              }
            },
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.language),
              label: Text('language'.tr()),
            ),
          ),
        ),

        const Spacer(),
      ],
    );
  }
}

class OnboardContent extends StatelessWidget {
  const OnboardContent({
    super.key,
    required this.illustration,
    required this.title,
    required this.text,
  });

  final String? illustration, title, text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Expanded(
            child: AspectRatio(
              aspectRatio: 1,
              child: illustration!.startsWith('http') 
                ? Image.network(illustration!, fit: BoxFit.contain)
                : illustration!.endsWith('.svg')
                    ? SvgPicture.asset(illustration!)
                    : Image.asset(illustration!, fit: BoxFit.contain),
            ),
          ),
          const SizedBox(height: 24),

          Text(
            title!,
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .titleLarge!
                .copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),

          Text(
            text!,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class DotIndicator extends StatelessWidget {
  const DotIndicator({
    super.key,
    this.isActive = false,
  });

  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      height: 8,
      width: isActive ? 24 : 8,
      decoration: BoxDecoration(
        color: isActive ? theme.colorScheme.primary : theme.colorScheme.primary.withOpacity(0.2),
        borderRadius: const BorderRadius.all(Radius.circular(20)),
      ),
    );
  }
}

List<Map<String, dynamic>> demoData = [
  {
    "type": "language",
    "title": "Choose Your Language",
    "text": "Select your preferred language to continue",
  },
  {
    "type": "info",
    "illustration": "assets/images/labour_onboarding.svg",
    "title": "onboard_labour_title",
    "text": "onboard_labour_text",
  },
  {
    "type": "info",
    "illustration": "assets/images/engineer_onboarding.svg",
    "title": "onboard_engineer_title",
    "text": "onboard_engineer_text",
  },
];
