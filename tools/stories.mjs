export const README_ORDER = [
  'selenium', 'hadal', 'effect', 'dichroic', 'cochineal', 'aerogel',
];

export const SHOTS = {
  selenium: ['dark', 'light'],
  hadal: ['dark', 'light'],
  effect: ['dark', 'light'],
  dichroic: ['dark', 'light'],
  cochineal: ['dark', 'light'],
  aerogel: ['dark', 'light'],
};

export const STORIES = {
  quantum: `Heat a gas and it does not glow across the spectrum, it glows at a handful of
exact wavelengths and nothing in between. Hydrogen gives you 4 visible lines,
neon gives you a fistful of reds, mercury a violet and a green so specific they
are still used to calibrate instruments. Quantum takes its violet, blue and
teal from that idea: a small set of exact positions rather than a smooth range.`,

  fraunhofer: `In 1814 Joseph von Fraunhofer pointed a prism at the sun and found hundreds of
dark gaps in the spectrum. They are elements in the sun's own atmosphere eating
their own colours on the way out. He labelled the strongest with letters and
those letters are still in use. Fraunhofer is the brightest family here, built
around the sodium D line, the hydrogen alpha and the magnesium triplet.`,

  persistence: `Oscilloscope phosphors are graded by how long they keep glowing after the beam
has moved on. P1 is the willemite green everyone pictures, P7 goes blue then
fades to a long yellow ghost, P11 is the blue used for photographing traces.
Persistence is the green one, and the warmer colours are the ghost that P7
leaves behind.`,

  anodise: `Anodised titanium has no pigment in it at all. The colour is an oxide layer a
few hundred nanometres thick, and which colour you get depends only on the
voltage: bronze around 20 volts, violet at 30, blue at 40, gold at 70. The metal
underneath never changes. Anodise is the quietest family, all interference and
no dye.`,

  coherence: `A mixed argon and krypton ion laser puts out 6 visible lines from one tube at
once, which is what a white laser actually is. Argon gives 457.9, 488.0 and
514.5 nm, krypton gives 413.1, 568.2 and 647.1. Every colour in the code is one
of those lines. There is no magenta anywhere in it, because magenta is not a
spectral colour and no laser can emit one. The interface falls to true black so
the only thing emitting on the screen is the code.`,

  valence: `Dissolve a transition metal and the water takes its colour. Permanganate is a
violet so intense a few grains stain a litre, dichromate is orange, copper is
sky blue, nickel green, cobalt chloride a deep blue that turns pink when it
picks up water. These are transmission colours, not emission, which is why they
read deeper and heavier than the rest of the collection.`,

  hadal: `Water eats colour by depth. Red is gone by 5 metres, orange by 20, yellow by
50, green by 100, and below 200 there is only blue. Hadal makes that the rule:
the colours that survive deepest get the most light and the most saturation,
and the ones that die shallow are left faded on purpose. The red is almost
grey, and it should be.`,

  cinnabar: `Before synthetic chemistry, colour was something you dug up and ground. Cinnabar
is mercury sulfide and gave the vermilion of Pompeii. Orpiment is arsenic and
was the only clean yellow for a thousand years, poisonous enough that painters
avoided mixing it with lead. Malachite, azurite and lapis came out of the same
kind of rock. Warm and heavy, because pigment is.`,

  epitaxy: `A polished silicon wafer is a dark mirror with a violet cast, and that is the
background. The syntax colours are the real emission peaks of the materials
grown on top of it: GaN at 405 nm, InGaN at 450 and 505, GaP at 555, AlGaInP at
590, AlGaAs at 660. The light variant is lit the way a cleanroom is lit, in
yellow, because photoresist cannot see that end of the spectrum.`,

  verdigris: `Copper does not corrode into one colour, it corrodes into a catalogue. Verdigris
is the blue green of an old roof, malachite the deeper green of the ore,
azurite the blue, cuprite the brick red of the first oxide layer, bornite the
purple tarnish that gives peacock ore its name. Brass sits underneath as the
metal before any of it happened.`,

  cherenkov: `A particle moving faster than light does in water drags a shockwave of light
behind it, and that is the blue glow in a reactor pool. The intensity rises as
1 over lambda squared, so the shorter the wavelength the stronger it gets,
which is why it looks violet blue. There is not a single warm colour in this
family, because the physics does not produce one.`,

  aerogel: `Aerogel is 99 percent air and scatters short wavelengths the same way the sky
does. Look at a block against a dark background and it is blue. Hold it up to a
lamp and the light that gets through is amber. Same material, two colours, so
the dark variant is the reflection and the light variant is the transmission.
This is the only pair here that comes from one physical fact rather than two.`,

  cavitation: `Drive a bubble in water with sound and it collapses in under a nanosecond,
reaching temperatures people still argue about, and emits a flash of light.
Nobody fully agrees why. The flash is blue white and almost too fast to
measure. Cavitation is the quietest palette in the collection, cold and low in
chroma, with one hot colour for the core.`,

  noctiluca: `Living light is nearly always blue green, because that is what travels furthest
through seawater. Dinoflagellates glow at 480 nm and turn a breaking wave into
a line of fire. Jellyfish green fluorescent protein sits at 509 and won a Nobel
prize for being useful. Fireflies are further toward yellow. The red is the
rarest thing here: one Brazilian beetle larva, the railroad worm, is the only
land animal known to make it.`,

  incandescence: `Heat steel and it tells you its temperature. Dull red around 600 degrees,
cherry at 750, orange at 900, amber at 1000, almost white by 1300. Blacksmiths
read it by eye and still do. In this family lightness is temperature, so the
ladder is not an aesthetic choice, it is the scale. The one cold colour is the
blue at the base of the forge flame.`,

  safelight: `Photographic paper cannot see the deep amber of an OC filter, which is why it is
the only light you are allowed to switch on in a darkroom. You learn to read
everything from one colour and how bright it is. Safelight works the same way:
the code is a single amber in 4 intensities, and the only real colour in it is
the red of the filter itself, kept for literals.`,

  dichroic: `A dichroic filter absorbs nothing. It splits. What passes through has one
colour and what reflects has exactly its complement, and there is no third.
Structure travels through the filter and takes the teal, data reflects back and
takes the magenta. That is the whole palette. The terminal is the one place
that breaks the rule, because red and green have to stay red and green.`,

  provenance: `Every theme in the world colours by grammar. This one colours by where a symbol
came from. What you defined here is gold and bold. What the language handed you
is cyan and italic. What cannot change any more is violet. The rest of your own
code is a single colour, and the keywords are deliberately dimmed, because you
already know that function is a function. Open a file and you see instantly
what is yours and what is borrowed.`,

  stratum: `A road cut through sediment is read by depth, not by content. Each band is a
different million years. Stratum takes the colour off the syntax entirely and
puts it on nesting depth: the code itself is one sandstone in 6 tones, and all
6 real colours are spent on bracket levels and indent guides. You see how deep
you are without counting.`,

  borrow: `Rust made a whole language out of one question: can this change, and who is
allowed to change it. Borrow puts that question on the colours. Constants and
anything read only are cold. Reassignable variables are warm. Parameters are
borrowed, so they are green and italic. And at the exact point where you write
into a variable, the name lights up. You stop looking for mutation and start
seeing it.`,

  palimpsest: `A palimpsest is a parchment scraped clean and written over, with the old text
still faintly readable underneath. Keywords, imports, punctuation and type
annotations are the scraped layer here, pushed back toward the background. The
names you chose and the data you wrote are the new text. Roughly two thirds of
the screen recedes on purpose.`,

  silverpoint: `Silverpoint is drawing with a silver stylus on prepared paper. There is no
colour, only line and tone, and no way to erase. Leonardo and Durer worked in
it. This family has no hue in the code at all: 6 greys, plus weight and italic
doing the work that colour usually does. The interface keeps a single silver
blue accent so you can still find your cursor.`,

  passepartout: `A passepartout is the card mat around a framed photograph. It is not decoration,
it is what makes the eye fall on the picture. Every theme puts the interface at
the same brightness as the editor or darker. This one inverts it: the mat is
far lighter than the plate, and the editor sits inside it as the print.`,

  effect: `Pure code and code that touches the world look identical in every theme. Here
they do not. Await, async, throw, catch and every mutation burn. Functions that
only compute, the types, and the data stay cold. It is the same idea a type
system uses to track effects, except you can see it without reading a
signature.`,

  cochineal: `Cochineal is a scale insect that lives on cactus, and carminic acid is what it
makes to keep ants away. It gave Europe its first true scarlet, worth close to
silver by weight, and it took about 70000 insects to make a pound of dye. The
background is the crimson sunk into the cloth, the syntax is the same dye at
different strengths.`,

  glacier: `Glacier ice is blue because pressure squeezes the air bubbles out, the light
path gets long, and red is absorbed on the way through. The older and more
compressed the ice, the deeper the blue. Nothing in this family drops to black,
not one surface, because nothing in a crevasse does either. The warm colours
are the sun on the surface and the rock band running through it.`,

  selenium: `Selenium toning shifts the blacks of a silver print toward purple and stretches
the tonal range at the same time. The result is an image that is warm in the
shadows and cool in the highlights at once. So this family does not pick 6
separate hues. It picks a ladder of lightness and lets the hue rotate as the
ladder descends.`,

  riso: `A Riso duplicator does not mix colour. It pulls one pass per ink and lays them
over each other, slightly out of register. The inks come from a fixed catalogue
you order by name, and the fluorescent pink is impossible to mistake for
anything else. These are 6 of them, printed on kraft.`,
};

export const SOURCES = {
  quantum: 'Emission lines of heated gases',
  fraunhofer: 'Absorption lines in sunlight',
  persistence: 'Oscilloscope phosphor decay',
  anodise: 'Interference on anodised titanium',
  coherence: '6 lines from one argon and krypton ion laser',
  valence: 'Transition metals dissolved in water',
  hadal: 'The depth at which each colour dies underwater',
  cinnabar: 'Mineral pigments ground before synthetic chemistry',
  epitaxy: 'A silicon wafer and real LED emission peaks',
  verdigris: 'What copper turns into as it corrodes',
  cherenkov: 'A reactor pool. No warm colour exists in it',
  aerogel: 'Rayleigh scattering. Blue reflected, amber transmitted',
  cavitation: 'Sonoluminescence, the flash of a collapsing bubble',
  noctiluca: 'Light made by living things',
  incandescence: 'The temperature scale of hot steel',
  safelight: 'A darkroom under an OC filter',
  dichroic: 'A dichroic filter. 2 hues in the whole of the code',
  provenance: 'Where each symbol came from',
  stratum: 'Sedimentary layers. Colour sits on nesting depth',
  borrow: 'Whether a thing can change, and where it is written to',
  palimpsest: 'A scraped and rewritten manuscript',
  silverpoint: 'A silver stylus on prepared paper. No hue anywhere',
  passepartout: 'The mat around a framed photograph',
  effect: 'Which code touches the world and which only computes',
  cochineal: 'Carminic acid, the first real scarlet Europe had',
  glacier: 'Compressed glacier ice. Nothing in it is black',
  selenium: 'Selenium toning. Hue rotates as tone drops',
  riso: 'The 6 spot inks you can order for a duplicator',
};
