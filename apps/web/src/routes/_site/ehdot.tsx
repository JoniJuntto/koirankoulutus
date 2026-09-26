import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "@/lib/head";
import { contact } from "@/lib/site";

export const Route = createFileRoute("/_site/ehdot")({
	component: TermsPage,
	head: pageHead("Kurssiehdot ja tietosuojaseloste"),
});

// MOCK: terms and privacy notice are placeholders; Teija must review them before launch.
function TermsPage() {
	return (
		<article className="mx-auto max-w-3xl px-5 py-14 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-3xl [&_h3]:mt-8 [&_h3]:font-semibold [&_h3]:text-lg [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
			<h1 className="font-display font-semibold text-5xl">
				Kurssiehdot ja tietosuoja
			</h1>
			<p className="text-muted-foreground">Päivitetty 26.9.2026</p>

			<h2>Kurssiehdot</h2>
			<h3>Ilmoittautuminen</h3>
			<p>
				Kurssipyyntö lähetetään verkkosivun lomakkeella. Pyyntö ei ole sitova.
				Ilmoittautuminen on sitova, kun kouluttaja on vahvistanut paikan
				sähköpostilla.
			</p>
			<h3>Maksaminen</h3>
			<p>
				Kurssimaksu laskutetaan sähköpostilla vahvistuksen jälkeen. Maksuaika on
				14 päivää, kuitenkin viimeistään ennen kurssin alkua. Liittymislinkki
				lähetetään, kun lasku on maksettu.
			</p>
			<h3>Peruutukset</h3>
			<ul>
				<li>
					Peruutus viimeistään 7 vuorokautta ennen kurssin alkua: maksuton.
				</li>
				<li>Peruutus myöhemmin: veloitamme 50 % kurssimaksusta.</li>
				<li>
					Kurssin alettua kurssimaksua ei palauteta. Väliin jääneitä kertoja ei
					hyvitetä.
				</li>
				<li>
					Kouluttaja voi perua kurssin, jos osallistujia on alle neljä tai
					kouluttaja sairastuu. Tällöin maksettu kurssimaksu palautetaan
					kokonaan tai kerta siirretään uuteen ajankohtaan.
				</li>
			</ul>
			<h3>Vastuu</h3>
			<p>
				Osallistuja vastaa koirastaan ja sen hyvinvoinnista harjoitusten aikana.
				Kurssikertoja ei saa tallentaa ilman kouluttajan lupaa.
			</p>

			<h2>Tietosuojaseloste</h2>
			<h3>Rekisterinpitäjä</h3>
			<p>
				koirankoulutus Nyt ja Tässä / Teija Tarkkanen, Riihimäki. Y-tunnus{" "}
				{contact.businessId}. Yhteydenotot:{" "}
				<a className="underline" href={`mailto:${contact.email}`}>
					{contact.email}
				</a>
				.
			</p>
			<h3>Mitä tietoja keräämme</h3>
			<p>
				Kurssipyynnön yhteydessä: nimi, sähköposti, puhelinnumero, koiran nimi,
				rotu ja ikä sekä vapaaehtoinen viesti.
			</p>
			<h3>Käyttötarkoitus ja peruste</h3>
			<p>
				Tietoja käytetään kurssipyynnön käsittelyyn, paikan vahvistamiseen,
				laskutukseen ja kurssia koskevaan viestintään. Käsittelyn peruste on
				sopimuksen valmistelu ja täytäntöönpano.
			</p>
			<h3>Säilytysaika</h3>
			<p>
				Kurssipyynnöt poistetaan 12 kuukauden kuluttua kurssin päättymisestä.
				Kirjanpitoon liittyvät tiedot säilytetään kirjanpitolain edellyttämän
				ajan.
			</p>
			<h3>Tietojen luovutus ja käsittelijät</h3>
			<p>
				Tietoja ei myydä tai luovuteta markkinointiin. Sähköpostit lähetetään
				Resend-palvelun kautta, ja tiedot säilytetään EU:ssa sijaitsevalla
				palvelimella.
			</p>
			<h3>Oikeutesi</h3>
			<p>
				Sinulla on oikeus tarkastaa tietosi, pyytää niiden korjaamista tai
				poistamista sekä tehdä valitus tietosuojavaltuutetulle. Lähetä pyyntö
				sähköpostilla yllä olevaan osoitteeseen.
			</p>
		</article>
	);
}
