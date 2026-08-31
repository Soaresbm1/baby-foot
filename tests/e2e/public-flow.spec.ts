import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test("la page d’accueil expose les actions principales", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Prêt à jouer ?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Créer un match/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Rejoindre un match/ })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("un utilisateur anonyme est redirigé vers la connexion", async ({ page }) => {
  await page.goto("/match/new");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)match(%2F|\/)new/);
  await expect(page.getByRole("heading", { name: "Entrez dans le jeu" })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("une adresse inconnue propose un retour à l’accueil", async ({ page }) => {
  await page.goto("/page-qui-n-existe-pas");
  await expect(page.getByRole("heading", { name: "Cette page n’existe pas." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Revenir à l’accueil" })).toHaveAttribute("href", "/");
  await expectNoAccessibilityViolations(page);
});
