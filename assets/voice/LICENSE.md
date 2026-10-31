# Project Z combat voice recordings (CC0)

Four real human male vocal takes are drawn from **HaelDB — “Male Grunt/Yelling sounds”**, published under the **CC0 1.0 public-domain dedication** (also offered under OGA-BY 3.0). We use the CC0 option.

Original creator and license: https://opengameart.org/content/male-gruntyelling-sounds
Redistributed, edited samples: https://github.com/transitive-bullshit/ai-safety-doom/tree/main/public/game/audio
Detailed processing and source filenames: https://github.com/transitive-bullshit/ai-safety-doom/blob/main/public/game/audio/README.md

| Project Z file | Redistributed source | Original take |
| --- | --- | --- |
| hero-grunt-a.wav | player-pain-1.wav | 3grunt1.wav |
| hero-grunt-b.wav | player-pain-2.wav | 3grunt3.wav |
| voice-yell.wav | player-death.wav | 3yell1.wav |
| voice-roar.wav | doom-baron-death.wav | 3yell9.wav (not Doom audio) |

They are **HaelDB voice recordings, not copyrighted Doom audio**. In-game playback pitch and sample duration can vary by character. No credit required under CC0; attribution retained here for provenance.

## New original AI-generated protagonist kiai (October 30, 2026)

The following three samples were newly generated specifically for **Project Z** using Higgsfield Mirelo Text to Audio. Their prompts describe **original high-pitched nonverbal martial-arts effort cries**; they do **not** use sound clips, a voice clone, or a named performer's actual recording.

| Local file | Game purpose | Generation job |
| --- | --- | --- |
| `hero-kiai-a.mp3` | Fast attack kiai A | `12aa15f0-6d21-4863-b128-48aaa3ed2cab` |
| `hero-kiai-b.mp3` | Alternate sharp attack kiai B | `2eb3f67c-aa6e-4d73-ae69-0ce15d6e6018` |
| `hero-kiai-power.mp3` | Strong dive / dash / execution kiai | `6fb479bf-21b9-43cf-8f0b-f6961f4747fa` |

The four HaelDB CC0 recordings above remain in the project. The original short hero grunt takes are now assigned to **enemy** hit reactions and cries. The player uses only the three newly generated hero kiai sources.

## Firearm operating mechanism Foley (October 31, 2026)

The following **nonverbal** sound effects were newly generated with Higgsfield Mirelo Text to Audio, intended as game attack accent sounds. These represent **steel slide, spring, cocking and bolt manipulation**, not gunshots or explosions:

| Local file | Action | Generation job |
| --- | --- | --- |
| `hero-mech-a.mp3` | Quick firearm charging-handle metal clack, light strike | `b455eea8-e575-4a94-acd3-3be2f1d142db` |
| `hero-mech-b.mp3` | Pistol slide and bolt-lock ratchet, alternative light strike | `d0b2f9a5-65a0-4b86-89c4-4edf5af27711` |
| `hero-mech-power.mp3` | Strong heavy rifle-bolt mechanical cycling, power strike | `b6436109-1ee0-4bfb-b299-fda5464d263e` |

The protagonist's previous `hero-kiai-*.mp3` voice assets are retained as archival game resources only; **no runtime voice mapping references them**. Protagonist hit and death vocal events are muted. Enemy human voices remain unchanged. Metal clicks use the accent bus; original impact transients and BGM each stay on their own bus.

## Firearm gunshot reports added October 31, 2026

Four original AI-generated gunshot Foley samples (Higgsfield Mirelo Text to Audio) are bundled locally. Each of the 19 basic attack animation labels maps to one of the four gunshot families, plus a slightly distinct playback rate, to avoid hearing the exact same report for every combo hit:

| Local file | Sound | Generation job |
| --- | --- | --- |
| `shot-pistol.mp3` | Sharp compact pistol discharge | `70287d73-35e1-4d9f-a228-c3c6fe028edb` |
| `shot-revolver.mp3` | Deep revolver discharge | `9f48608d-f582-4fde-bae1-ffbeb0d83f41` |
| `shot-rifle.mp3` | Bright metallic rifle discharge | `76b80d05-7cb8-43ac-950b-7bad7561f989` |
| `shot-heavy.mp3` | Heavy shotgun discharge and pump rattle | `8dd15581-9f0e-4ba8-a794-cd33687913c1` |

Gunshot recordings play on a separate foreground gunfire bus with onset-silence trimming; all samples are predecoded at start. Original punch impact SFX, BGM, CC0 enemy vocals, and short slide/bolt Foley remain independent. Dashes, jump starts, parries, pursuit, ordinary walking and running also have mechanical accents. No voice clips are used for the protagonist.
