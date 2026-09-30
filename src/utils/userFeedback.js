export function userFacingError(error) {
  if (/invalid login credentials/i.test(error)) return 'E-mailadres of wachtwoord klopt niet. Controleer beide en probeer opnieuw.';
  if (/email not confirmed/i.test(error)) return 'Bevestig eerst je e-mailadres via de ontvangen e-mail. Vraag de organisatie om hulp als je die niet kunt vinden.';
  if (/failed to fetch|fetch failed|networkerror|network request failed/i.test(error)) return 'De verbinding is onderbroken. Je actie kan al verwerkt zijn. Ververs en controleer het resultaat voordat je opnieuw probeert.';
  if (/row.level security|permission denied|unauthorized|forbidden/i.test(error)) return 'Je hebt geen toegang tot deze actie. Ververs de spelstand of vraag de organisatie om hulp.';
  if (/foreign key|violates.*constraint/i.test(error)) return 'Dit kan nu niet worden verwerkt omdat gegevens nog gekoppeld zijn of inmiddels veranderd zijn. Ververs en controleer je keuze; vraag zo nodig de beheerder om hulp.';
  return error;
}
