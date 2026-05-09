"use strict";
const HELIX_COUNT = 20;
const VALID_BASE_RE = /[^ATCG]/g;
const BASES = ["A", "T", "C", "G"];
const BASE_INDEX = Object.freeze({ A: 0, T: 1, C: 2, G: 3 });
const CAT_COLOR = Object.freeze({
	Body: "#f97316",
	Legs: "#a78bfa",
	Arms: "#fb7185",
	Neck: "#34d399",
	Tail: "#f59e0b",
	Feet: "#38bdf8",
	Head: "#e879f9",
	Face: "#818cf8",
	Mouth: "#fb923c",
	Antlers: "#86efac",
	Hat: "#fbbf24",
	Color: "#6ee7b7",
	Pattern: "#67e8f9",
	Locomotion: "#f472b6",
	Behavior: "#94a3b8",
	Signals: "#c084fc",
});
const GENES = {
	SIZE: { m: 95, s: 100, g: [100, 50, 35, 75], cat: "Body" },
	BONES: { m: 95, s: 100, g: [14, 0, -14, 0], cat: "Body" },
	BONES2: { m: 60, s: 100, g: [0, 0, -16, 16], cat: "Body" },
	OSTODERM: { m: 100, s: 1, g: [0, 1, 2, 1], cat: "Body" },
	OSTO_SIZE: { m: 100, s: 100, g: [15, 30, 45, 30], cat: "Body" },
	GIANT_DWARF: {
		m: 100,
		s: 100,
		g: [66, 100, 133, 100],
		cat: "Body",
	},
	TAIL_BOTTOM: { m: 100, s: 1, g: [0, 1, 0, 0], cat: "Tail" },
	LEG_STRETCH2: {
		m: 100,
		s: 100,
		g: [0, -16, 16, 0],
		cat: "Legs",
	},
	ARM_STRETCH2: {
		m: 100,
		s: 100,
		g: [16, 0, -16, 0],
		cat: "Arms",
	},
	HEAD_THICK_SKULL: {
		m: 100,
		s: 100,
		g: [0, 0, 0, 20],
		cat: "Head",
	},
	NECK_STIFF: { m: 100, s: 1, g: [1, 0, 0, 1], cat: "Neck" },
	GUT: { m: 100, s: 100, g: [45, 0, 0, 25], cat: "Body" },
	GUT_IS_UDDER: { m: 100, s: 1, g: [0, 2, 1, 0], cat: "Body" },
	DERRIERE: { m: 85, s: 100, g: [10, 40, 0, 70], cat: "Body" },
	LEG_IS_CIRCLE: { m: 100, s: 1, g: [0, 1, 0, 0], cat: "Legs" },
	FOOT_IS_CIRCLE: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Feet" },
	TONGUE: { m: 100, s: 100, g: [60, 0, 0, 40], cat: "Mouth" },
	TONGUE_SEGS: { m: 100, s: 1, g: [0, 0, 1, 2], cat: "Mouth" },
	BELLY_ALT: { m: 100, s: 1, g: [1, 0, 2, 1], cat: "Color" },
	PAT_BELLY: {
		m: 100,
		s: 100,
		g: [100, 33, 50, 75],
		cat: "Pattern",
	},
	LITTER_SIZE: { m: 100, s: 1, g: [3, 2, 1, 5], cat: "Behavior" },
	OLD_AGE: { m: 100, s: 1, g: [0, 0, -1, 2], cat: "Behavior" },
	OMNIVORE: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Behavior" },
	LIMP: { m: 100, s: 1, g: [0, 0, 2, 1], cat: "Behavior" },
	MUSCLE_USE: {
		m: 100,
		s: 100,
		g: [80, 50, 100, 100],
		cat: "Body",
	},
	TAIL_STIFF: { m: 100, s: 1, g: [0, 1, 1, 0], cat: "Tail" },
	LEG_FLEXIBILITY: {
		m: 80,
		s: 1,
		g: [50, 20, 40, 30],
		cat: "Legs",
	},
	LEG_FLEX_BIAS: {
		m: 100,
		s: 1,
		g: [10, -10, 15, 20],
		cat: "Legs",
	},
	TAIL_FLEXIBILITY: {
		m: 100,
		s: 1,
		g: [45, 90, 15, 135],
		cat: "Tail",
	},
	TAIL_SPEED: { m: 100, s: 10, g: [60, 0, 200, 60], cat: "Tail" },
	LEG_AND_ARM_LIMP: {
		m: 100,
		s: 1,
		g: [0, 0, 1, 0],
		cat: "Legs",
	},
	ARM_STRENGTH: {
		m: 60,
		s: 100,
		g: [95, 120, 80, 104],
		cat: "Arms",
	},
	ARM_FLEXIBILITY: {
		m: 100,
		s: 1,
		g: [30, 40, 20, 30],
		cat: "Arms",
	},
	ARM_FLEX_BIAS: {
		m: 100,
		s: 1,
		g: [0, 10, 20, 15],
		cat: "Arms",
	},
	NECK_FLEXIBILITY: {
		m: 100,
		s: 1,
		g: [0, 10, 40, 23],
		cat: "Neck",
	},
	NECK_FLEX_BIAS: {
		m: 100,
		s: 1,
		g: [0, -25, 30, -8],
		cat: "Neck",
	},
	BRAIN_SPASTIC: {
		m: 100,
		s: 1,
		g: [2, 0, 0, 1],
		cat: "Locomotion",
	},
	SPLAY: { m: 100, s: 1, g: [0, -5, 10, 45], cat: "Legs" },
	LEG_IN: { m: 50, s: 100, g: [6, 0, 0, 18], cat: "Legs" },
	LEG_IN2: { m: 100, s: 100, g: [0, 1, 0, 13], cat: "Legs" },
	TAIL_ANGLE: { m: 100, s: 1, g: [135, 60, 90, 45], cat: "Tail" },
	TAIL_JOINT_TYPE: { m: 100, s: 1, g: [0, 1, 0, 0], cat: "Tail" },
	LEG_JOINT_TYPE: { m: 100, s: 1, g: [0, 2, 0, 1], cat: "Legs" },
	HAS_KNEE: { m: 100, s: 1, g: [0, 0, 1, 0], cat: "Legs" },
	KNEE_MIN: { m: 100, s: 1, g: [-15, 0, 0, -90], cat: "Legs" },
	KNEE_MAX: { m: 100, s: 1, g: [90, 20, 20, 45], cat: "Legs" },
	ARM_JOINT_TYPE: { m: 100, s: 1, g: [0, 2, 1, 0], cat: "Arms" },
	HAS_ELBOW: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Arms" },
	ELBOW_RANGE: { m: 100, s: 1, g: [10, 90, 30, 30], cat: "Arms" },
	NECK_JOINT_TYPE: { m: 100, s: 1, g: [0, 1, 2, 0], cat: "Neck" },
	HEAD_JOINTED: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Head" },
	STIFF_JOINTS: {
		m: 100,
		s: 100,
		g: [50, 0, 0, 18],
		cat: "Legs",
	},
	LEG_TAG: { m: 100, s: 1, g: [1, 2, 3, 4], cat: "Legs" },
	LEG_HAS_FOOT: { m: 100, s: 1, g: [1, 0, 0, 1], cat: "Legs" },
	LEG_COUNT: { m: 100, s: 1, g: [7, 2, 1, 1], cat: "Legs" },
	LEG_THRUST_BACK: { m: 100, s: 1, g: [2, 0, 1, 0], cat: "Legs" },
	ARM_TAG: { m: 100, s: 1, g: [4, 2, 3, 1], cat: "Arms" },
	ARM_HAS_HAND: { m: 100, s: 1, g: [0, 1, 1, 0], cat: "Arms" },
	NECK_TAG: { m: 100, s: 1, g: [4, 1, 2, 3], cat: "Neck" },
	NECK_SLOUCH: { m: 60, s: 100, g: [0, 50, 0, 20], cat: "Neck" },
	NECK_ONTOP: { m: 100, s: 100, g: [20, 50, 70, 0], cat: "Neck" },
	BREAK_FORCE: {
		m: 100,
		s: 10,
		g: [50, 0, 30, 0],
		cat: "Locomotion",
	},
	EAR_X: { m: 90, s: 100, g: [100, 0, 0, 50], cat: "Face" },
	QUADRUPED: { m: 100, s: 1, g: [1, 0, 1, 0], cat: "Locomotion" },
	BIPED: { m: 100, s: 1, g: [1, 0, 1, 0], cat: "Locomotion" },
	UPARM_TAG: { m: 100, s: 1, g: [0, 2, 1, 4], cat: "Arms" },
	UPARM_Y: { m: 80, s: 100, g: [30, 10, 30, 50], cat: "Arms" },
	UPARM_GOOFY: { m: 100, s: 1, g: [0, 3, 1, 2], cat: "Arms" },
	ARM_FORWARD: { m: 100, s: 1, g: [40, 0, -20, 60], cat: "Arms" },
	UPARM_ANGLE: {
		m: 100,
		s: 1,
		g: [-30, -45, 30, 0],
		cat: "Arms",
	},
	WHITE_IS_LETHAL: {
		m: 100,
		s: 1,
		g: [0, 0, 0, 1],
		cat: "Color",
	},
	ASPECT: { m: 95, s: 100, g: [150, 250, 310, 200], cat: "Body" },
	SKINNY: { m: 100, s: 100, g: [200, 75, 100, 100], cat: "Body" },
	CHEST_BIG: {
		m: 100,
		s: 100,
		g: [104, 102, 108, 102],
		cat: "Body",
	},
	CHEST_SMALL: {
		m: 100,
		s: 100,
		g: [95, 90, 100, 95],
		cat: "Body",
	},
	NECK_TYPE: { m: 100, s: 1, g: [1, 1, 2, 0], cat: "Neck" },
	NECK_LENGTH: {
		m: 90,
		s: 100,
		g: [60, 70, 30, 90],
		cat: "Neck",
	},
	NECK_GIRAFFE: {
		m: 90,
		s: 100,
		g: [85, 110, 0, 120],
		cat: "Neck",
	},
	NECK_THICKNESS: {
		m: 60,
		s: 100,
		g: [80, 120, 95, 110],
		cat: "Neck",
	},
	NECK_ANGLE: { m: 90, s: 1, g: [30, 45, 60, 75], cat: "Neck" },
	NECK_COCK: { m: 100, s: 1, g: [20, -25, 0, 30], cat: "Neck" },
	TAIL_TAG: { m: 100, s: 1, g: [4, 3, 1, 2], cat: "Tail" },
	TAIL_EXISTS: { m: 100, s: 1, g: [1, 2, 0, 1], cat: "Tail" },
	TAIL_SIZE: {
		m: 60,
		s: 100,
		g: [120, 140, 80, 100],
		cat: "Tail",
	},
	TAIL_SHORT: {
		m: 100,
		s: 100,
		g: [50, 100, 100, 35],
		cat: "Tail",
	},
	TAIL_ASPECT: {
		m: 90,
		s: 100,
		g: [20, 20, 30, 10],
		cat: "Tail",
	},
	TAIL_SHAPE: { m: 100, s: 1, g: [2, 5, 6, 1], cat: "Tail" },
	TAIL_SEGMENTS: { m: 100, s: 1, g: [5, 0, 3, 3], cat: "Tail" },
	TAIL_WAG: { m: 100, s: 1, g: [0, 0, 1, 0], cat: "Tail" },
	LEG_TYPE: { m: 100, s: 1, g: [2, 1, 0, 1], cat: "Legs" },
	LEG_LENGTH: {
		m: 90,
		s: 100,
		g: [50, 120, 80, 100],
		cat: "Legs",
	},
	LEG_STRETCH: { m: 60, s: 100, g: [14, 0, -14, 0], cat: "Legs" },
	LEG_SKEW: { m: 60, s: 100, g: [0, 0, 24, -16], cat: "Legs" },
	LEG_STRENGTH: {
		m: 60,
		s: 100,
		g: [104, 80, 120, 95],
		cat: "Legs",
	},
	LEG_PENCIL: { m: 100, s: 100, g: [0, 10, 0, 0], cat: "Legs" },
	ARM_TYPE: { m: 100, s: 1, g: [0, 0, 1, 2], cat: "Arms" },
	ARM_LENGTH: {
		m: 90,
		s: 100,
		g: [80, 50, 120, 25],
		cat: "Arms",
	},
	ARM_STRETCH: { m: 60, s: 100, g: [14, 0, -14, 0], cat: "Arms" },
	ARM_SKEW: { m: 100, s: 100, g: [0, 0, 20, -20], cat: "Arms" },
	ARM_NODE_SCALE: {
		m: 50,
		s: 100,
		g: [100, 70, 100, 130],
		cat: "Arms",
	},
	HAS_FOOT: { m: 100, s: 1, g: [0, 1, 1, 0], cat: "Feet" },
	FOOT_SIZE: { m: 60, s: 100, g: [12, 20, 30, 0], cat: "Feet" },
	FOOT_CLOWN: { m: 100, s: 100, g: [0, 30, 0, 0], cat: "Feet" },
	FOOT_THICKNESS: {
		m: 80,
		s: 100,
		g: [30, 20, 15, 7],
		cat: "Feet",
	},
	FOOT_TOE: { m: 100, s: 100, g: [100, 100, 50, 0], cat: "Feet" },
	FOOT_BACKWARDS: { m: 100, s: 1, g: [0, 2, 0, 1], cat: "Feet" },
	HAS_HAND: { m: 100, s: 1, g: [1, 0, 0, 1], cat: "Feet" },
	HAND_WIDTH: { m: 100, s: 100, g: [7, 0, 20, 0], cat: "Feet" },
	HAND_LENGTH: {
		m: 90,
		s: 100,
		g: [15, 20, 20, 30],
		cat: "Feet",
	},
	HAND_FINGER: { m: 80, s: 100, g: [50, 100, 0, 0], cat: "Feet" },
	SKIN_HANDS: { m: 100, s: 1, g: [0, 2, 1, 0], cat: "Feet" },
	HEAD_SIZE: {
		m: 95,
		s: 100,
		g: [75, 133, 50, 100],
		cat: "Head",
	},
	HEAD_X_GROWTH: {
		m: 100,
		s: 100,
		g: [0, -5, 5, 10],
		cat: "Head",
	},
	HEAD_Y_GROWTH: {
		m: 100,
		s: 100,
		g: [5, 0, -5, 0],
		cat: "Head",
	},
	HEAD_ASPECT: {
		m: 85,
		s: 100,
		g: [250, 200, 175, 300],
		cat: "Head",
	},
	HEAD_SQUARE: {
		m: 100,
		s: 100,
		g: [100, 150, 0, 0],
		cat: "Head",
	},
	HEAD_HAS_BACK: { m: 100, s: 1, g: [1, 0, 0, 11], cat: "Head" },
	HEAD_GIANT: {
		m: 90,
		s: 100,
		g: [180, 200, 100, 100],
		cat: "Head",
	},
	HEAD_SHRUNK: {
		m: 90,
		s: 100,
		g: [70, 50, 100, 100],
		cat: "Head",
	},
	HEAD_CHIMERA: { m: 100, s: 1, g: [0, 1, 0, 0], cat: "Head" },
	EYEBOX_X: { m: 90, s: 100, g: [33, 15, 50, 0], cat: "Face" },
	EYEBOX_Y: {
		m: 100,
		s: 100,
		g: [-25, -50, -100, 0],
		cat: "Face",
	},
	EYEBOX_SIZE: {
		m: 60,
		s: 100,
		g: [25, 15, 50, 33],
		cat: "Face",
	},
	SKIN_HEAD: { m: 100, s: 1, g: [0, 2, 1, 0], cat: "Head" },
	EYE_STYLE: { m: 100, s: 1, g: [2, 1, 1, 0], cat: "Face" },
	BUGEYE: { m: 100, s: 1, g: [1, 2, 0, 0], cat: "Face" },
	EYE_SIZE: { m: 100, s: 100, g: [50, 125, 75, 50], cat: "Face" },
	PUPIL_SIZE: {
		m: 100,
		s: 100,
		g: [80, 40, 66, 40],
		cat: "Face",
	},
	HAS_PUPIL: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Face" },
	BROW_SIZE: { m: 100, s: 100, g: [150, 125, 0, 0], cat: "Face" },
	BROW_SLANT: { m: 100, s: 1, g: [15, -15, 0, 0], cat: "Face" },
	EYE_HUE: { m: 100, s: 1, g: [198, 153, 237, 36], cat: "Face" },
	EAR_STYLE: { m: 100, s: 1, g: [0, 1, 0, 2], cat: "Face" },
	EAR_SHAPE: { m: 100, s: 1, g: [4, 2, 2, 1], cat: "Face" },
	EAR_SIZE: { m: 70, s: 100, g: [40, 20, 30, 10], cat: "Face" },
	EAR_ASPECT: {
		m: 100,
		s: 100,
		g: [100, 250, 300, 100],
		cat: "Face",
	},
	EAR_SLANT: { m: 70, s: 100, g: [100, -33, 50, 0], cat: "Face" },
	EAR_INTERIOR: { m: 100, s: 100, g: [0, 5, 0, 0], cat: "Face" },
	EAR_FLOP: { m: 100, s: 1, g: [60, 30, 0, 200], cat: "Face" },
	TEETH_SHAPE: { m: 100, s: 1, g: [3, 0, 1, 2], cat: "Mouth" },
	HAS_MOUTH: { m: 100, s: 1, g: [1, 1, 1, 0], cat: "Mouth" },
	MOUTH_Y: { m: 80, s: 100, g: [50, 100, 70, 84], cat: "Mouth" },
	MOUTH_SIZE: {
		m: 70,
		s: 100,
		g: [40, 30, 20, 10],
		cat: "Mouth",
	},
	JAW: { m: 50, s: 100, g: [15, -13, 0, -8], cat: "Mouth" },
	TEETH_UPPER: { m: 100, s: 1, g: [0, 0, 0, 1], cat: "Mouth" },
	TEETH_UPPER2: { m: 100, s: 1, g: [0, 0, 1, 0], cat: "Mouth" },
	NOSE_STYLE: { m: 100, s: 1, g: [0, 2, 3, 1], cat: "Mouth" },
	NOSE_INNY: { m: 100, s: 1, g: [0, 0, 1, 0], cat: "Mouth" },
	NOSE_Y: { m: 90, s: 100, g: [50, 100, 0, 0], cat: "Mouth" },
	NOSE_SIZE: { m: 70, s: 100, g: [10, 100, 20, 5], cat: "Mouth" },
	NOSE_INTERIOR: {
		m: 100,
		s: 100,
		g: [0, 100, 0, 50],
		cat: "Mouth",
	},
	FLU_IMMUNITY: { m: 100, s: 1, g: [0, 0, 0, 1], cat: "Mouth" },
	HAS_ANTLERS: { m: 100, s: 1, g: [1, 0, 1, 1], cat: "Antlers" },
	ANTLER_X: { m: 100, s: 1, g: [2, 1, 1, 0], cat: "Antlers" },
	ANTLER_W: {
		m: 100,
		s: 100,
		g: [12, 15, 8, 12],
		cat: "Antlers",
	},
	ANTLER_H: {
		m: 80,
		s: 100,
		g: [45, 65, 100, 25],
		cat: "Antlers",
	},
	ANTLER_TAPER: {
		m: 100,
		s: 100,
		g: [50, 100, 0, 100],
		cat: "Antlers",
	},
	ANTLER_POM: {
		m: 100,
		s: 100,
		g: [100, 150, 0, 200],
		cat: "Antlers",
	},
	ANTLER_COLOR: { m: 100, s: 1, g: [2, 3, 8, 1], cat: "Antlers" },
	POM_COLOR: { m: 100, s: 1, g: [17, 1, 0, 2], cat: "Antlers" },
	POM_USECOLOR: { m: 100, s: 1, g: [0, 0, 0, 1], cat: "Antlers" },
	HAT_POM: { m: 100, s: 100, g: [50, 0, 0, 25], cat: "Hat" },
	HAT_POM_IS_LID: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Hat" },
	ANTLER_REC: { m: 100, s: 1, g: [1, 2, 0, 3], cat: "Antlers" },
	ANTLER_REC2: { m: 100, s: 1, g: [0, 1, 2, 3], cat: "Antlers" },
	ANTLER_FLIP: { m: 100, s: 1, g: [0, 1, 0, 0], cat: "Antlers" },
	ANTLER_MOD: { m: 100, s: 1, g: [1, 3, 2, 3], cat: "Antlers" },
	ANTLER_SCALEH: {
		m: 80,
		s: 100,
		g: [100, 40, 75, 100],
		cat: "Antlers",
	},
	ANTLER_SCALEW: {
		m: 100,
		s: 100,
		g: [100, 100, 75, 50],
		cat: "Antlers",
	},
	ANTLER_ANGLE: {
		m: 100,
		s: 1,
		g: [-45, -25, 25, 45],
		cat: "Antlers",
	},
	ANTLER_ANGLE2: {
		m: 100,
		s: 1,
		g: [45, 90, -45, -90],
		cat: "Antlers",
	},
	ANTLER_ANGLE_RAND: {
		m: 100,
		s: 1,
		g: [45, 5, 15, 0],
		cat: "Antlers",
	},
	ANTLER_T1: {
		m: 100,
		s: 100,
		g: [40, 25, 0, 100],
		cat: "Antlers",
	},
	ANTLER_T2: {
		m: 100,
		s: 100,
		g: [100, 40, 25, 0],
		cat: "Antlers",
	},
	HAT_EXISTS: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Hat" },
	HAT_SIZE: { m: 85, s: 100, g: [40, 100, 60, 20], cat: "Hat" },
	HAT_RAKE: { m: 100, s: 100, g: [0, -15, 0, 25], cat: "Hat" },
	HAT_ASPECT: {
		m: 85,
		s: 100,
		g: [100, 300, 100, 200],
		cat: "Hat",
	},
	HAT_TAPER: { m: 100, s: 100, g: [0, 0, 50, 100], cat: "Hat" },
	HAT_CLONE: { m: 100, s: 100, g: [0, 66, 0, 33], cat: "Hat" },
	HAT_BACK_SCALE: {
		m: 100,
		s: 100,
		g: [0, 100, 100, 60],
		cat: "Hat",
	},
	HAT_FRONT_SCALE: {
		m: 100,
		s: 100,
		g: [100, 60, 100, 0],
		cat: "Hat",
	},
	HAT_BACK_ANGLE: {
		m: 75,
		s: 1,
		g: [45, 60, 90, 120],
		cat: "Hat",
	},
	HAT_FRONT_ANGLE: {
		m: 100,
		s: 1,
		g: [-120, -60, -45, -90],
		cat: "Hat",
	},
	HAT_ANGLE_RAND: {
		m: 100,
		s: 1,
		g: [15, 0, 15, 45],
		cat: "Hat",
	},
	HAT_FLIP: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Hat" },
	HAT_T: { m: 100, s: 100, g: [40, 100, 0, 0], cat: "Hat" },
	BASE_BROWN: { m: 100, s: 1, g: [0, 1, 2, 0], cat: "Color" },
	BASE_BLACK: { m: 100, s: 1, g: [1, 0, 0, 1], cat: "Color" },
	BASE_RED: { m: 100, s: 1, g: [3, 1, 2, 0], cat: "Color" },
	BASE_GREEN: { m: 70, s: 1, g: [2, 0, 1, 3], cat: "Color" },
	GREEN_KNOCKOUT: { m: 100, s: 1, g: [1, 0, 0, 0], cat: "Color" },
	BASE_CREAM: { m: 50, s: 100, g: [0, 0, 0, 100], cat: "Color" },
	ALT_BLUE: { m: 100, s: 1, g: [1, 0, 3, 2], cat: "Color" },
	SPOT_YELLOW: { m: 100, s: 1, g: [1, 0, 0, 1], cat: "Color" },
	SKIN_HUE: { m: 100, s: 1, g: [2, 3, 0, 1], cat: "Color" },
	SKIN_HUE2: { m: 100, s: 1, g: [1, 0, 3, 2], cat: "Color" },
	SWAP_BASE_SPOT: { m: 100, s: 1, g: [0, 1, 0, 1], cat: "Color" },
	SWAP_ALT_SPOT: { m: 100, s: 1, g: [1, 0, 0, 1], cat: "Color" },
	WHITE: { m: 100, s: 1, g: [0, 1, 0, 0], cat: "Color" },
	NOSE_HUE: { m: 100, s: 1, g: [1, 3, 2, 0], cat: "Mouth" },
	HOOF_COLOR: { m: 100, s: 1, g: [2, 1, 0, 0], cat: "Color" },
	AGOUTI: { m: 100, s: 1, g: [1, 0, 1, 0], cat: "Color" },
	FOOT_IS_HOOF: { m: 100, s: 1, g: [1, 1, 0, 0], cat: "Feet" },
	COON_EYE: { m: 100, s: 1, g: [2, 0, 1, 0], cat: "Face" },
	EAR_COMP: { m: 100, s: 1, g: [1, 0, 2, 0], cat: "Face" },
	TAIL_ALT: { m: 100, s: 1, g: [0, 2, 0, 1], cat: "Tail" },
	PAT_SPLIT: {
		m: 100,
		s: 100,
		g: [65, 0, 0, 100],
		cat: "Pattern",
	},
	PAT_STRIPE: {
		m: 100,
		s: 100,
		g: [51, 90, 0, 0],
		cat: "Pattern",
	},
	PAT_SPOT: { m: 100, s: 100, g: [0, 0, 90, 51], cat: "Pattern" },
	PAT_PERLIN: {
		m: 100,
		s: 100,
		g: [60, 0, 100, 0],
		cat: "Pattern",
	},
	PAT_PERLIN2: {
		m: 100,
		s: 100,
		g: [0, 100, 60, 0],
		cat: "Pattern",
	},
	PAT_PERLIN_SIZE: {
		m: 100,
		s: 1,
		g: [2, 4, 4, 8],
		cat: "Pattern",
	},
	NARCOLEPSY: {
		m: 100,
		s: 1,
		g: [0, 0, 0, 1],
		cat: "Locomotion",
	},
	SPEED_FACTOR: {
		m: 75,
		s: 100,
		g: [50, 133, 30, 100],
		cat: "Locomotion",
	},
	NECK_SPEED: { m: 100, s: 10, g: [60, 10, 50, 25], cat: "Neck" },
	RAMPAGE: { m: 100, s: 1, g: [0, 0, 1, 0], cat: "Locomotion" },
	SPINAL_LOCO: {
		m: 100,
		s: 1,
		g: [2, 1, 0, 0],
		cat: "Locomotion",
	},
	HIGH_INTELLECT: {
		m: 100,
		s: 1,
		g: [0, 1, 0, 1],
		cat: "Behavior",
	},
	L_LEG_SIGNAL: { m: 100, s: 1, g: [2, 1, 1, 1], cat: "Signals" },
	L_ARM_SIGNAL: { m: 100, s: 1, g: [2, 1, 2, 2], cat: "Signals" },
	L_TAIL_SIGNAL: {
		m: 100,
		s: 1,
		g: [3, 2, 1, 4],
		cat: "Signals",
	},
	L_NECK_SIGNAL: {
		m: 100,
		s: 1,
		g: [2, 4, 3, 1],
		cat: "Signals",
	},
	LOCO_SYNC: { m: 100, s: 1, g: [0, 1, 0, 0], cat: "Locomotion" },
	L_LEG_FTOB_REACT: {
		m: 100,
		s: 1,
		g: [1, 1, 2, 3],
		cat: "Signals",
	},
	L_LEG_FTOB_EVENT: {
		m: 100,
		s: 1,
		g: [1, 2, 4, 3],
		cat: "Signals",
	},
	L_LEG_BTOF_REACT: {
		m: 100,
		s: 1,
		g: [2, 3, 1, 2],
		cat: "Signals",
	},
	L_LEG_BTOF_EVENT: {
		m: 100,
		s: 1,
		g: [1, 2, 4, 3],
		cat: "Signals",
	},
	L_ARM_FTOB_REACT: {
		m: 100,
		s: 1,
		g: [2, 3, 1, 2],
		cat: "Signals",
	},
	L_ARM_FTOB_EVENT: {
		m: 100,
		s: 1,
		g: [2, 3, 4, 1],
		cat: "Signals",
	},
	L_ARM_BTOF_REACT: {
		m: 100,
		s: 1,
		g: [2, 1, 3, 1],
		cat: "Signals",
	},
	L_ARM_BTOF_EVENT: {
		m: 100,
		s: 1,
		g: [3, 1, 2, 4],
		cat: "Signals",
	},
	L_TAIL_FTOB_REACT: {
		m: 100,
		s: 1,
		g: [3, 2, 0, 1],
		cat: "Signals",
	},
	L_TAIL_FTOB_EVENT: {
		m: 100,
		s: 1,
		g: [4, 1, 2, 3],
		cat: "Signals",
	},
	L_TAIL_BTOF_REACT: {
		m: 100,
		s: 1,
		g: [2, 1, 3, 0],
		cat: "Signals",
	},
	L_TAIL_BTOF_EVENT: {
		m: 100,
		s: 1,
		g: [2, 1, 3, 4],
		cat: "Signals",
	},
	L_NECK_FTOB_REACT: {
		m: 100,
		s: 1,
		g: [4, 1, 2, 0],
		cat: "Signals",
	},
	L_NECK_FTOB_EVENT: {
		m: 100,
		s: 1,
		g: [2, 3, 1, 4],
		cat: "Signals",
	},
	L_NECK_BTOF_REACT: {
		m: 100,
		s: 1,
		g: [4, 0, 1, 2],
		cat: "Signals",
	},
	L_NECK_BTOF_EVENT: {
		m: 100,
		s: 1,
		g: [3, 2, 1, 4],
		cat: "Signals",
	},
};
const HELIX_MAP = [
	[
		"BONES",
		"BONES2",
		"OSTODERM",
		"OSTO_SIZE",
		"GIANT_DWARF",
		"TAIL_BOTTOM",
		"LEG_STRETCH2",
		"ARM_STRETCH2",
		"HEAD_THICK_SKULL",
		"NECK_STIFF",
	],
	[
		"GUT",
		"GUT_IS_UDDER",
		"DERRIERE",
		"LEG_IS_CIRCLE",
		"FOOT_IS_CIRCLE",
		"TONGUE",
		"TONGUE_SEGS",
		"BELLY_ALT",
		"PAT_BELLY",
		"LITTER_SIZE",
		"OLD_AGE",
		"OMNIVORE",
		"LIMP",
	],
	[
		"MUSCLE_USE",
		"TAIL_STIFF",
		"LEG_FLEXIBILITY",
		"LEG_FLEX_BIAS",
		"TAIL_FLEXIBILITY",
		"TAIL_SPEED",
		"LEG_AND_ARM_LIMP",
		"ARM_STRENGTH",
		"ARM_FLEXIBILITY",
		"ARM_FLEX_BIAS",
		"NECK_FLEXIBILITY",
		"NECK_FLEX_BIAS",
		"BRAIN_SPASTIC",
	],
	[
		"SPLAY",
		"LEG_IN",
		"LEG_IN2",
		"TAIL_ANGLE",
		"TAIL_JOINT_TYPE",
		"LEG_JOINT_TYPE",
		"HAS_KNEE",
		"KNEE_MIN",
		"KNEE_MAX",
		"ARM_JOINT_TYPE",
		"HAS_ELBOW",
		"ELBOW_RANGE",
		"NECK_JOINT_TYPE",
		"HEAD_JOINTED",
		"STIFF_JOINTS",
	],
	[
		"LEG_TAG",
		"LEG_HAS_FOOT",
		"LEG_COUNT",
		"LEG_THRUST_BACK",
		"ARM_TAG",
		"ARM_HAS_HAND",
		"NECK_TAG",
		"NECK_SLOUCH",
		"NECK_ONTOP",
		"BREAK_FORCE",
		"EAR_X",
	],
	[
		"QUADRUPED",
		"BIPED",
		"UPARM_TAG",
		"UPARM_Y",
		"UPARM_GOOFY",
		"ARM_FORWARD",
		"UPARM_ANGLE",
		"WHITE_IS_LETHAL",
	],
	[
		"SIZE",
		"ASPECT",
		"SKINNY",
		"CHEST_BIG",
		"CHEST_SMALL",
		"NECK_TYPE",
		"NECK_LENGTH",
		"NECK_GIRAFFE",
		"NECK_THICKNESS",
		"NECK_ANGLE",
		"NECK_COCK",
	],
	[
		"TAIL_TAG",
		"TAIL_EXISTS",
		"TAIL_SIZE",
		"TAIL_SHORT",
		"TAIL_ASPECT",
		"TAIL_SHAPE",
		"TAIL_SEGMENTS",
		"TAIL_WAG",
	],
	[
		"LEG_TYPE",
		"LEG_LENGTH",
		"LEG_STRETCH",
		"LEG_SKEW",
		"LEG_STRENGTH",
		"LEG_PENCIL",
		"ARM_TYPE",
		"ARM_LENGTH",
		"ARM_STRETCH",
		"ARM_SKEW",
		"ARM_NODE_SCALE",
	],
	[
		"HAS_FOOT",
		"FOOT_SIZE",
		"FOOT_CLOWN",
		"FOOT_THICKNESS",
		"FOOT_TOE",
		"FOOT_BACKWARDS",
		"HAS_HAND",
		"HAND_WIDTH",
		"HAND_LENGTH",
		"HAND_FINGER",
		"SKIN_HANDS",
	],
	[
		"HEAD_SIZE",
		"HEAD_X_GROWTH",
		"HEAD_Y_GROWTH",
		"HEAD_ASPECT",
		"HEAD_SQUARE",
		"HEAD_HAS_BACK",
		"HEAD_GIANT",
		"HEAD_SHRUNK",
		"HEAD_CHIMERA",
		"EYEBOX_X",
		"EYEBOX_Y",
		"EYEBOX_SIZE",
		"SKIN_HEAD",
	],
	[
		"EYE_STYLE",
		"BUGEYE",
		"EYE_SIZE",
		"PUPIL_SIZE",
		"HAS_PUPIL",
		"BROW_SIZE",
		"BROW_SLANT",
		"EYE_HUE",
		"EAR_STYLE",
		"EAR_SHAPE",
		"EAR_SIZE",
		"EAR_ASPECT",
		"EAR_SLANT",
		"EAR_INTERIOR",
		"EAR_FLOP",
	],
	[
		"TEETH_SHAPE",
		"HAS_MOUTH",
		"MOUTH_Y",
		"MOUTH_SIZE",
		"JAW",
		"TEETH_UPPER",
		"TEETH_UPPER2",
		"NOSE_STYLE",
		"NOSE_INNY",
		"NOSE_Y",
		"NOSE_SIZE",
		"NOSE_INTERIOR",
		"FLU_IMMUNITY",
	],
	[
		"HAS_ANTLERS",
		"ANTLER_X",
		"ANTLER_W",
		"ANTLER_H",
		"ANTLER_TAPER",
		"ANTLER_POM",
		"ANTLER_COLOR",
		"POM_COLOR",
		"POM_USECOLOR",
		"HAT_POM",
		"HAT_POM_IS_LID",
	],
	[
		"ANTLER_REC",
		"ANTLER_REC2",
		"ANTLER_FLIP",
		"ANTLER_MOD",
		"ANTLER_SCALEH",
		"ANTLER_SCALEW",
		"ANTLER_ANGLE",
		"ANTLER_ANGLE2",
		"ANTLER_ANGLE_RAND",
		"ANTLER_T1",
		"ANTLER_T2",
	],
	[
		"HAT_EXISTS",
		"HAT_SIZE",
		"HAT_RAKE",
		"HAT_ASPECT",
		"HAT_TAPER",
		"HAT_CLONE",
		"HAT_BACK_SCALE",
		"HAT_FRONT_SCALE",
		"HAT_BACK_ANGLE",
		"HAT_FRONT_ANGLE",
		"HAT_ANGLE_RAND",
		"HAT_FLIP",
		"HAT_T",
	],
	[
		"BASE_BROWN",
		"BASE_BLACK",
		"BASE_RED",
		"BASE_GREEN",
		"GREEN_KNOCKOUT",
		"BASE_CREAM",
		"ALT_BLUE",
		"SPOT_YELLOW",
		"SKIN_HUE",
		"SKIN_HUE2",
		"SWAP_BASE_SPOT",
		"SWAP_ALT_SPOT",
		"WHITE",
		"NOSE_HUE",
		"HOOF_COLOR",
	],
	[
		"AGOUTI",
		"FOOT_IS_HOOF",
		"COON_EYE",
		"EAR_COMP",
		"TAIL_ALT",
		"PAT_SPLIT",
		"PAT_STRIPE",
		"PAT_SPOT",
		"PAT_PERLIN",
		"PAT_PERLIN2",
		"PAT_PERLIN_SIZE",
	],
	[
		"NARCOLEPSY",
		"SPEED_FACTOR",
		"NECK_SPEED",
		"RAMPAGE",
		"SPINAL_LOCO",
		"HIGH_INTELLECT",
		"L_LEG_SIGNAL",
		"L_ARM_SIGNAL",
		"L_TAIL_SIGNAL",
		"L_NECK_SIGNAL",
		"LOCO_SYNC",
	],
	[
		"L_LEG_FTOB_REACT",
		"L_LEG_FTOB_EVENT",
		"L_LEG_BTOF_REACT",
		"L_LEG_BTOF_EVENT",
		"L_ARM_FTOB_REACT",
		"L_ARM_FTOB_EVENT",
		"L_ARM_BTOF_REACT",
		"L_ARM_BTOF_EVENT",
		"L_TAIL_FTOB_REACT",
		"L_TAIL_FTOB_EVENT",
		"L_TAIL_BTOF_REACT",
		"L_TAIL_BTOF_EVENT",
		"L_NECK_FTOB_REACT",
		"L_NECK_FTOB_EVENT",
		"L_NECK_BTOF_REACT",
		"L_NECK_BTOF_EVENT",
	],
];
const makeUniformGenome = (base = "A") =>
	Array.from({ length: HELIX_COUNT }, (_, i) => {
		const n = HELIX_MAP[i]?.length ?? 0;
		const s = base.repeat(n);
		return [s, s];
	});
const EMPTY_GENOME = () => makeUniformGenome("");
function sanitizeSequence(value) {
	return String(value || "")
		.toUpperCase()
		.replace(VALID_BASE_RE, "");
}
function normalizeGenome(genome) {
	return genome.map(([s1 = "", s2 = ""]) => [
		sanitizeSequence(s1),
		sanitizeSequence(s2),
	]);
}
function cycleBase(base) {
	const i = BASES.indexOf(base);
	return BASES[(i + 1 + BASES.length) % BASES.length];
}
function baseChip(base, size = "sm") {
	return BASES.includes(base)
		? `<span class="base base-${base} base-${size}">${base}</span>`
		: '<span class="muted">?</span>';
}
function valueColor(v) {
	if (v == null) return "var(--muted)";
	if (v > 0) return "var(--green-hi)";
	if (v < 0) return "var(--red-lo)";
	return "var(--muted)";
}
function getGeneValue(gene, base) {
	if (
		!gene ||
		!Object.prototype.hasOwnProperty.call(BASE_INDEX, base)
	)
		return null;
	return gene.g[BASE_INDEX[base]];
}
function alleleSummary(gene) {
	return `A=${gene.g[0]}, T=${gene.g[1]}, C=${gene.g[2]}, G=${gene.g[3]}`;
}
function getHelixIndexFactory() {
	const m = new Map();
	let next = 0;
	return (raw) => {
		const label = String(raw).toUpperCase();
		if (/^\d{1,2}$/.test(label)) {
			const i = Number.parseInt(label, 10);
			return i >= 0 && i < HELIX_COUNT ? i : -1;
		}
		if (!m.has(label)) {
			if (next >= HELIX_COUNT) return -1;
			m.set(label, next++);
		}
		return m.get(label);
	};
}
function parseGenome(text) {
	const genome = EMPTY_GENOME();
	const lines = String(text || "")
		.trim()
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	const getHelixIndex = getHelixIndexFactory();
	let current = -1;
	const patterns = {
		newFormat: /^([A-Za-z0-9]+)\s*:\s*([atcg]+)$/i,
		numbered: /^(\d{1,2})\s*:\s*([atcg]+)$/i,
		verboseBoth:
			/^helix\s*([A-Za-z0-9]+)[^:)]*[:\)]\s*([atcg]+)\s*:\s*(?:second\s*strand|strand\s*2)[^:]*:\s*([atcg]+)$/i,
		verboseFirst:
			/^helix\s*([A-Za-z0-9]+)[^:)]*[:\)]\s*([atcg]+)$/i,
		verboseSecond:
			/^(?:second\s*strand|strand\s*2)[^:]*:\s*([atcg]+)$/i,
		bareStrand: /^[atcg]+$/i,
	};
	function assign(i, seq) {
		if (i < 0 || i >= HELIX_COUNT) return;
		if (!genome[i][0]) genome[i][0] = seq;
		else genome[i][1] = seq;
	}
	for (const line of lines) {
		let match = line.match(patterns.newFormat);
		if (match) {
			assign(getHelixIndex(match[1]), match[2].toUpperCase());
			continue;
		}
		match = line.match(patterns.numbered);
		if (match) {
			assign(
				Number.parseInt(match[1], 10),
				match[2].toUpperCase(),
			);
			continue;
		}
		match = line.match(patterns.verboseBoth);
		if (match) {
			current = getHelixIndex(match[1]);
			if (current >= 0) {
				genome[current][0] = match[2].toUpperCase();
				genome[current][1] = match[3].toUpperCase();
			}
			continue;
		}
		match = line.match(patterns.verboseFirst);
		if (match) {
			current = getHelixIndex(match[1]);
			if (current >= 0)
				genome[current][0] = match[2].toUpperCase();
			continue;
		}
		match = line.match(patterns.verboseSecond);
		if (match && current >= 0) {
			genome[current][1] = match[1].toUpperCase();
			continue;
		}
		if (
			current >= 0 &&
			!genome[current][1] &&
			patterns.bareStrand.test(line)
		)
			genome[current][1] = line.toUpperCase();
	}
	return normalizeGenome(genome);
}
function formatGenomeForExport(genome) {
	const lines = [];
	genome.forEach(([s1, s2], i) => {
		const label = String(i).padStart(2, "0");
		if (s1) lines.push(`${label}:${s1}`);
		if (s2) lines.push(`${label}:${s2}`);
	});
	return lines.join("\n");
}


export {
	HELIX_COUNT,
	VALID_BASE_RE,
	BASES,
	BASE_INDEX,
	CAT_COLOR,
	GENES,
	HELIX_MAP,
	makeUniformGenome,
	EMPTY_GENOME,
	sanitizeSequence,
	normalizeGenome,
	cycleBase,
	baseChip,
	valueColor,
	getGeneValue,
	alleleSummary,
	getHelixIndexFactory,
	parseGenome,
	formatGenomeForExport,
}
