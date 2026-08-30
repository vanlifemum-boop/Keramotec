/* Bewerbungsformular der Partnerseite.
 *
 * Die Seite liegt statisch auf GitHub Pages, es gibt also keinen Server, der
 * eine Bewerbung entgegennehmen koennte. Deshalb zwei Wege, oben einzustellen:
 *
 *   ENDPUNKT  – URL eines Formulardienstes (Formspree, Tally, Basin ...).
 *               Ist sie gesetzt, wird die Bewerbung direkt dorthin geschickt.
 *   EMPFAENGER – E-Mail-Adresse. Ohne Endpunkt wird die Bewerbung als fertige
 *               Mail im Mailprogramm des Bewerbers geoeffnet.
 *
 * Ist beides leer, bleibt der Absende-Button gesperrt und die Seite sagt es
 * deutlich — besser ein sichtbarer Hinweis als Bewerbungen, die ins Leere
 * laufen.
 */
(function () {
  "use strict";

  // ---- Einstellungen ----
  var ENDPUNKT = "";
  var EMPFAENGER = "";
  // -----------------------

  var form = document.querySelector("[data-partner-form]");
  if (!form) return;

  var hint = form.querySelector("[data-form-hint]");
  var submit = form.querySelector('button[type="submit"]');

  function setHint(text, state) {
    if (!hint) return;
    hint.textContent = text;
    hint.className = "form-hint" + (state ? " form-hint-" + state : "");
  }

  // Ohne Ziel gar nicht erst absenden lassen.
  if (!ENDPUNKT && !EMPFAENGER) {
    if (submit) submit.disabled = true;
    setHint(
      "Hier fehlt noch die Bewerbungsadresse. Sie wird in partner.js eingetragen, " +
        "bevor die Seite veröffentlicht wird.",
      "warn"
    );
    return;
  }

  function fieldsOf(el) {
    return Array.prototype.slice.call(el.querySelectorAll("input, select, textarea"));
  }

  function labelOf(field) {
    var label = form.querySelector('label[for="' + field.id + '"]');
    var text = label ? label.textContent : field.name;
    return text.replace(/\s*\*\s*$/, "").trim();
  }

  function showError(field, message) {
    var wrap = field.closest(".form-field, .form-consent");
    if (!wrap) return;
    var box = wrap.querySelector(".form-error");
    if (!box) {
      box = document.createElement("span");
      box.className = "form-error";
      wrap.appendChild(box);
    }
    box.textContent = message;
    field.setAttribute("aria-invalid", "true");
  }

  function clearError(field) {
    var wrap = field.closest(".form-field, .form-consent");
    if (!wrap) return;
    var box = wrap.querySelector(".form-error");
    if (box) box.remove();
    field.removeAttribute("aria-invalid");
  }

  function validate() {
    var fehler = [];
    fieldsOf(form).forEach(function (field) {
      clearError(field);
      if (!field.required) return;

      var leer =
        field.type === "checkbox" ? !field.checked : !String(field.value).trim();
      if (leer) {
        showError(
          field,
          field.type === "checkbox" ? "Ohne dieses Häkchen dürfen wir die Anfrage nicht bearbeiten." : "Bitte ausfüllen."
        );
        fehler.push(field);
        return;
      }
      if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value.trim())) {
        showError(field, "Diese Adresse sieht nicht vollständig aus.");
        fehler.push(field);
      }
    });
    return fehler;
  }

  function sammeln() {
    var daten = {};
    fieldsOf(form).forEach(function (field) {
      if (field.type === "checkbox") {
        daten[field.name] = field.checked ? "ja" : "nein";
      } else if (String(field.value).trim()) {
        daten[field.name] = field.value.trim();
      }
    });
    return daten;
  }

  function alsText(daten) {
    return Object.keys(daten)
      .map(function (schluessel) {
        return schluessel + ": " + daten[schluessel];
      })
      .join("\n");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var fehler = validate();
    if (fehler.length) {
      setHint("Bitte ergänze die markierten Felder.", "warn");
      fehler[0].focus();
      return;
    }

    var daten = sammeln();
    var betreff = "Partnerbewerbung Keramotec – " + (daten["Postleitzahl"] || "") + " " + (daten["Name"] || "");

    if (ENDPUNKT) {
      setHint("Bewerbung wird gesendet …");
      if (submit) submit.disabled = true;
      fetch(ENDPUNKT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(daten),
      })
        .then(function (antwort) {
          if (!antwort.ok) throw new Error(antwort.status);
          form.reset();
          setHint("Danke — deine Bewerbung ist angekommen. Wir melden uns.", "ok");
        })
        .catch(function () {
          setHint(
            "Das Absenden hat nicht geklappt. Schreib uns bitte direkt eine E-Mail.",
            "warn"
          );
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
      return;
    }

    window.location.href =
      "mailto:" +
      EMPFAENGER +
      "?subject=" +
      encodeURIComponent(betreff.trim()) +
      "&body=" +
      encodeURIComponent(alsText(daten));
    setHint("Deine Bewerbung wurde als E-Mail vorbereitet — bitte im Mailprogramm abschicken.", "ok");
  });

  // Fehlermeldung verschwindet, sobald das Feld korrigiert wird.
  form.addEventListener("input", function (event) {
    if (event.target.getAttribute("aria-invalid")) clearError(event.target);
  });
  form.addEventListener("change", function (event) {
    if (event.target.getAttribute("aria-invalid")) clearError(event.target);
  });
})();
