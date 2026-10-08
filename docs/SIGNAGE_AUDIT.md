# Signage & road-marking audit

**Status: draft. Not reviewed by a driving instructor or Statens vegvesen.**
Checked on 2026-10-08 against *Forskrift om offentlige trafikkskilt, vegoppmerking,
trafikklyssignaler og anvisninger* (skiltforskriften, FOR-2005-10-07-1219,
[lovdata.no](https://lovdata.no/dokument/SF/forskrift/2005-10-07-1219)).
The machine-readable list is `src/learning/signs.ts`. A unit test fails if a «Skilt NNN …»
citation in the content does not match a number and name in that list.

Rule: **no sign is invented.** Every sign or marking in the 3D world is one of the
regulated ones below, or it is plainly not a traffic sign (street-name plates, shop signs).

## Errors found and fixed this pass

| Where | Was | Now | Why |
|---|---|---|---|
| `bank.ts` q-s1 forkjørsvei source | «Skilt 208 Forkjørsveg» | «Skilt 206 Forkjørsveg» | 208 is *Slutt på forkjørsveg* |

## Signs in the world

| No. | Name | Where | Visual check | Notes |
|---|---|---|---|---|
| 202 | Vikeplikt | S3 side-street exit; S5 every arm (right-hand side + splitter island) | Red border, white field, point down ✓ | Placed with vikelinje 1022 |
| 362 | Fartsgrense | S1 + S2 (30), S3 + S5 (40), S4 (30) | Red ring, white field, black numerals ✓ | A 30 zone could also use 366 *Fartsgrensesone*. Both are valid |
| 512 | Holdeplass for buss | S3 shelter, S5 bus lay-by | Blue square, white bus ✓ (pictogram simplified) | Pictogram is a stylised drawing |
| 516 | Gangfelt | S4 both approaches; S5 crossings | Blue square, white triangle, black pedestrian ✓ | Placed at the crossing, on the right |

**S1 has no signs and no vikelinje at the intersection, on purpose.** It is an uncontrolled
crossing (høyreregelen, trafikkreglene § 7). Adding any sign there would change the rule
the scenario teaches.

## Markings in the world

| No. | Name | Colour | Where |
|---|---|---|---|
| 1002 | Varsellinje (centre, dashed) | Yellow (§ 21 nr. 3: separates opposing directions) | S3, S4, S5 arms |
| 1004 | Sperrelinje (solid) | Yellow | S4 on the crossing approach (no overtaking at the crossing) |
| 1008 | Skillelinje (bike lane) | White | S3 bike lanes (dashed across the side-street mouth) |
| 1012 | Kantlinje | White | S4, S5 |
| 1022 | Vikelinje (triangles) | White | S3 side street, S5 entries |
| 1024 | Gangfelt (zebra) | White | S4, S5 |

## Open items for expert review

1. **Red bike-lane surface (S3).** Skiltforskriften does not regulate surface colour. Red
   asphalt in sykkelfelt is common Norwegian practice (Statens vegvesen design guidance), but
   it is not checked against the current handbook (N302 *Trafikkskilt / vegoppmerking*). Verify.
2. **Vikelinje drawn as triangles («haitenner»).** The forskrift names the marking (1022). The
   shape and size are in the vegoppmerking handbook. The triangle size is approximate.
3. **Sign size and height** are simplified (0.75 m panel at 2.3 m). Real sizes depend on the
   speed limit and road class (handbook N300).
4. **Bicycle symbol 1039** is not painted in the S3 bike lanes yet. The skillelinje and the red
   surface carry the meaning for now. Add the symbol before any claim of being «correct».
5. **S5 roundabout** has no sign 406 *Påbudt rundkjøring* and no fareskilt 126. Both are
   optional depending on the site. Confirm the minimal set an instructor expects.
6. **Street-name plates** («Lerkeveien», «Kirkegata») are fictional names and not traffic signs.
