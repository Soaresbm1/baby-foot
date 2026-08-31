import { expect, test } from "@playwright/test";

test("la page d’accueil expose les actions principales", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Prêt à jouer ?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Créer un match/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Rejoindre un match/ })).toBeVisible();
});

test("un utilisateur anonyme est redirigé vers la connexion", async ({ page }) => {
  await page.goto("/match/new");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)match(%2F|\/)new/);
  await expect(page.getByRole("heading", { name: "Entrez dans le jeu" })).toBeVisible();
});
