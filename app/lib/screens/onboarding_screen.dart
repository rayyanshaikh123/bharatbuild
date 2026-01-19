import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int currentPage = 0;
  String selectedLanguage = 'en';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
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
                    return LanguageOnboard(
                      selectedLanguage: selectedLanguage,
                      onChanged: (lang) {
                        setState(() {
                          selectedLanguage = lang;
                        });
                      },
                    );
                  }

                  return OnboardContent(
                    illustration: item["illustration"],
                    title: item["title"],
                    text: item["text"],
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
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ElevatedButton(
                onPressed: () {
                  if (currentPage < demoData.length - 1) {
                    setState(() {
                      currentPage++;
                    });
                  } else {
                    Navigator.pushNamed(
                      context,
                      '/login',
                      arguments: {
                        'role': 'labour',
                        'language': selectedLanguage,
                      },
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.primaryForeground,
                  minimumSize: const Size(double.infinity, 40),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  currentPage == demoData.length - 1
                      ? "CONTINUE"
                      : "NEXT",
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

/// ---------------- LANGUAGE PAGE ----------------

class LanguageOnboard extends StatelessWidget {
  final String selectedLanguage;
  final Function(String) onChanged;

  const LanguageOnboard({
    super.key,
    required this.selectedLanguage,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Spacer(),
        Icon(Icons.language, size: 80, color: Colors.grey.shade700),
        const SizedBox(height: 24),

        Text(
          "Choose Your Language",
          style: Theme.of(context)
              .textTheme
              .titleLarge!
              .copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        Text(
          "Select your preferred language to continue",
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 32),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: DropdownButtonFormField<String>(
            value: selectedLanguage,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              labelText: "Language",
            ),
            items: const [
              DropdownMenuItem(value: "en", child: Text("English")),
              DropdownMenuItem(value: "hi", child: Text("हिंदी (Hindi)")),
              DropdownMenuItem(value: "mr", child: Text("मराठी (Marathi)")),
            ],
            onChanged: (value) {
              if (value != null) onChanged(value);
            },
          ),
        ),

        const Spacer(),
      ],
    );
  }
}

/// ---------------- INFO PAGE ----------------

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
    return Column(
      children: [
        Expanded(
          child: AspectRatio(
            aspectRatio: 1,
            child: Image.network(illustration!, fit: BoxFit.contain),
          ),
        ),
        const SizedBox(height: 16),

        Text(
          title!,
          style: Theme.of(context)
              .textTheme
              .titleLarge!
              .copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),

        Text(
          text!,
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

/// ---------------- DOT INDICATOR ----------------

class DotIndicator extends StatelessWidget {
  const DotIndicator({
    super.key,
    this.isActive = false,
    this.activeColor = const Color(0xFF22A45D),
    this.inActiveColor = const Color(0xFF868686),
  });

  final bool isActive;
  final Color activeColor, inActiveColor;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      margin: const EdgeInsets.symmetric(horizontal: 8),
      height: 5,
      width: 8,
      decoration: BoxDecoration(
        color: isActive ? activeColor : inActiveColor.withOpacity(0.25),
        borderRadius: const BorderRadius.all(Radius.circular(20)),
      ),
    );
  }
}

/// ---------------- ONBOARDING DATA ----------------

List<Map<String, dynamic>> demoData = [
  {
    "type": "language",
    "title": "Choose Your Language",
    "text": "Select your preferred language to continue",
  },
  {
    "type": "info",
    "illustration": "https://i.postimg.cc/CKQF6tZB/construction1.png",
    "title": "Built for Real Construction Sites",
    "text":
        "Digitize attendance, daily progress and material tracking even when internet is weak or unavailable.",
  },
  {
    "type": "info",
    "illustration": "https://i.postimg.cc/yYy0L3Jk/construction2.png",
    "title": "Simple Site to Office Flow",
    "text":
        "Site Engineer submits data, Manager approves, Owner gets real-time visibility across all projects.",
  },
];
