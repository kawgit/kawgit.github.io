const assert = function(condition, message) {
	if (!condition)
		throw Error('Assert failed: ' + (message || ''));
};

class V3 { // right hand coordinate system
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}

class V2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Face {
	// indexes of 3 vertices in parent Scene list of vertices
	constructor(i1, i2, i3) {
		this.i1 = i1;
		this.i2 = i2;
		this.i3 = i3;
	}
}

class Scene {
	constructor(path, obj_txt) {
		this.vertices = [];
		this.faces = [];
		this.path = path;

		let lines = obj_txt.split("\n");
		for (let line of lines) {
			if (line.startsWith("#")) continue;
			else if (line.startsWith("v ")) {
				let words = line.split(" ");
				this.vertices.push(new V3(parseFloat(words[1].split("/")[0]),
					parseFloat(words[3].split("/")[0]),
					parseFloat(words[2].split("/")[0])));
			}
			else if (line.startsWith("f ")) {
				let words = line.split(" ");
				let face = new Face(parseInt(words[1].split("/")[0]) - 1,
					parseInt(words[2].split("/")[0]) - 1,
					parseInt(words[3].split("/")[0]) - 1);
				assert(0 <= face.i1 && face.i1 < this.vertices.length, "0 <= face.i1 && face.i1 < this.vertices.length | " + line);
				assert(0 <= face.i2 && face.i2 < this.vertices.length, "0 <= face.i2 && face.i2 < this.vertices.length | " + line);
				assert(0 <= face.i3 && face.i3 < this.vertices.length, "0 <= face.i3 && face.i3 < this.vertices.length | " + line);
				this.faces.push(face);
			}
			else {
				if (line.trim().length != 0) {
					console.log("unhandled pretext " + line.split(" ")[0]);
				}
			}
		}
	}


}

class Camera {
	constructor(position = new V3(0, 0, 0), rotation = new V3(0, 0, 0), speed = 3) {
		this.position = position;
		this.rotation = rotation;
		this.speed = speed;
	}
}

let keys = new Map();
addEventListener("keydown", function(e) {
	keys.set(e.key, true);
});
addEventListener("keyup", function(e) {
	keys.set(e.key, false);
});

let canvas = document.getElementById("canvas");
let fps_count = document.getElementById("fps_count");
let BACKGROUND_COLOR = "#ADD8E6";
let CANVAS_WIDTH = canvas.width;
let CANVAS_HEIGHT = canvas.height;
let FOV_DENSITY = 70 / 180 * Math.PI / CANVAS_HEIGHT;
let X_FOV = FOV_DENSITY * CANVAS_WIDTH;
let Y_FOV = FOV_DENSITY * CANVAS_HEIGHT;
let SENSITIVITY = 1.5;
let SUN_VEC = new V3(10, 10, 10);
let curr_scene_path = "";

function v3_distance(a, b) {
	return Math.sqrt(Math.pow(a.x - b.x, 2)
		+ Math.pow(a.y - b.y, 2)
		+ Math.pow(a.z - b.z, 2));
}

function rgb(r, g, b) {
	return `rgb(${r}, ${g}, ${b})`;
}

function hsl(h, s, l) {
	return `hsl(${h}, ${s}%, ${l}%)`;
}

function draw_triange(ctx, v1, v2, v3) {
	if (!(v1.onscreen || v2.onscreen || v3.onscreen)) return;
	ctx.beginPath();
	ctx.moveTo(v1.x, v1.y);
	ctx.lineTo(v2.x, v2.y);
	ctx.lineTo(v3.x, v3.y);
	ctx.closePath();
	ctx.fill();
}

function hypot(a, b, c = 0) {
	return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2) + Math.pow(c, 2));
}

function better_arctan(a, o) {
	if (a == 0 && o == 0) return 0;
	if (o < 0) {
		return -Math.acos(a / hypot(a, o));
	}
	else {
		return Math.acos(a / hypot(a, o));
	}
}

function normalize_angle(x) {
	while (x < -Math.PI) x += 2 * Math.PI;
	while (x > Math.PI) x -= 2 * Math.PI;
	return x;
}

function cross(a, b) {
	return new V3(a.y * b.z - a.z * b.y,
		a.z * b.x - a.x * b.z,
		a.x * b.y - a.y * b.x);
}

function angle_between(a, b) {
	return Math.acos((a.x * b.x + a.y * b.y + a.z * b.z) / (hypot(a.x, a.y, a.z) * hypot(b.x, b.y, b.z)));
}

function avg(arr) {
	let sum = 0;
	for (let item of arr) {
		sum += item;
	}
	return sum / arr.length;
}

function sum(arr) {
	let sum = 0;
	for (let item of arr) {
		sum += item;
	}
	return sum;
}

function render_loop(camera, scene, time_of_last_render) {
	let ctx = canvas.getContext("2d");

	// fill background
	ctx.fillStyle = BACKGROUND_COLOR;
	ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

	// translate 3d vertices to 2d screen coordinates
	let translated_coords = new Array(scene.vertices.length);
	for (let i in scene.vertices) {
		let vertice = scene.vertices[i];
		let rel_position = new V3(vertice.x - camera.position.x,
			vertice.y - camera.position.y,
			vertice.z - camera.position.z);

		let z_cyl = new V3(rel_position.z,
			hypot(rel_position.x, rel_position.y),
			normalize_angle(better_arctan(rel_position.x, rel_position.y) - camera.rotation.x));

		let post_z = new V3(z_cyl.y * Math.cos(z_cyl.z),
			z_cyl.y * Math.sin(z_cyl.z),
			z_cyl.x);

		let y_cyl = new V3(post_z.y,
			hypot(post_z.x, post_z.z),
			normalize_angle(better_arctan(post_z.x, post_z.z) - camera.rotation.y));

		let post_y = new V3(y_cyl.y * Math.cos(y_cyl.z),
			y_cyl.x,
			y_cyl.y * Math.sin(y_cyl.z));

		let norm_position = post_y;


		let polar_rot = new V2(better_arctan(norm_position.y, norm_position.z),
			better_arctan(norm_position.x, hypot(norm_position.y, norm_position.z)));
		translated_coords[i] = new V2(CANVAS_WIDTH / 2 - polar_rot.y / FOV_DENSITY * Math.cos(polar_rot.x),
			CANVAS_HEIGHT / 2 - polar_rot.y / FOV_DENSITY * Math.sin(polar_rot.x));
		translated_coords[i].onscreen = translated_coords[i].x >= 0
			&& translated_coords[i].x <= CANVAS_WIDTH
			&& translated_coords[i].y >= 0
			&& translated_coords[i].y <= CANVAS_HEIGHT;
	}

	// calculate faces distances from cameray
	for (let face of scene.faces) {
		face.distance = avg([v3_distance(scene.vertices[face.i1], camera.position),
		v3_distance(scene.vertices[face.i2], camera.position),
		v3_distance(scene.vertices[face.i3], camera.position)]);
	}

	// sort faces in descending order by distance from camera
	scene.faces.sort((a, b) => b.distance - a.distance)

	// render faces
	SUN_VEC = new V3(Math.cos(Date.now() / 1000), Math.sin(Date.now() / 1000), 1);
	for (let face of scene.faces) {
		// let color_scalar = 255 - Math.floor(slope * (face.distance - min_distance));

		let face_normal = cross(new V3(scene.vertices[face.i2].x - scene.vertices[face.i1].x,
			scene.vertices[face.i2].y - scene.vertices[face.i1].y,
			scene.vertices[face.i2].z - scene.vertices[face.i1].z),
			new V3(scene.vertices[face.i3].x - scene.vertices[face.i1].x,
				scene.vertices[face.i3].y - scene.vertices[face.i1].y,
				scene.vertices[face.i3].z - scene.vertices[face.i1].z));

		let neg_face_normal = new V3(-face_normal.x,
			-face_normal.y,
			-face_normal.z);

		let vec_to_player = new V3(camera.position.x - scene.vertices[face.i1].x,
			camera.position.y - scene.vertices[face.i1].y,
			camera.position.z - scene.vertices[face.i1].z);

		if (angle_between(neg_face_normal, vec_to_player) < angle_between(face_normal, vec_to_player)) {
			face_normal = neg_face_normal;
		}

		let color_scalar = Math.cos(angle_between(SUN_VEC, face_normal));

		ctx.fillStyle = rgb(70 + Math.floor(180 * color_scalar), 
			70 + Math.floor(100 * color_scalar), 
			50 + Math.floor(40 * color_scalar));
		
		draw_triange(ctx, translated_coords[face.i1],
			translated_coords[face.i2],
			translated_coords[face.i3]);
	}

	// display fps
	let now_time = Date.now();
	let delta_time = (now_time - time_of_last_render) / 1000;
	let fps = 1 / (delta_time + .001);
	fps_count.innerHTML = Math.round(fps.toString());

	// wasd move camera
	let horizontal_transform = new V2(0, 0);
	if (keys.get("w")) horizontal_transform.x++;
	if (keys.get("a")) horizontal_transform.y++;
	if (keys.get("s")) horizontal_transform.x--;
	if (keys.get("d")) horizontal_transform.y--;
	if (horizontal_transform.x != 0 || horizontal_transform.y != 0) {
		let angle = better_arctan(horizontal_transform.x, horizontal_transform.y) + camera.rotation.x;
		camera.position = new V3(camera.position.x + camera.speed * Math.cos(angle) * delta_time,
			camera.position.y + camera.speed * Math.sin(angle) * delta_time,
			camera.position.z);
	}

	// eq move camera
	let vertical_transform = 0;
	if (keys.get("e")) vertical_transform++;
	if (keys.get("q")) vertical_transform--;
	if (vertical_transform != 0) {
		camera.position.z += vertical_transform * camera.speed * delta_time;
	}

	// ijkl rotate camera
	let rotational_transform = new V2(0, 0);
	if (keys.get("i")) rotational_transform.y++;
	if (keys.get("j")) rotational_transform.x++;
	if (keys.get("k")) rotational_transform.y--;
	if (keys.get("l")) rotational_transform.x--;
	if (rotational_transform.x != 0 || rotational_transform.y != 0) {
		camera.rotation.x += rotational_transform.x * SENSITIVITY * delta_time;
		camera.rotation.y += rotational_transform.y * SENSITIVITY * delta_time;
		camera.rotation.x = normalize_angle(camera.rotation.x);
		if (camera.rotation.y < -Math.PI / 2) camera.rotation.y = -Math.PI / 2;
		if (camera.rotation.y > Math.PI / 2) camera.rotation.y = Math.PI / 2;
	}

	if (document.getElementById("running").checked && curr_scene_path == scene.path) {
		window.requestAnimationFrame(function() { render_loop(camera, scene, now_time) });
	}
}

let scene_settings = new Map();
scene_settings.set('bear.obj', new Camera(new V3(0, 40, 0), new V2(-Math.PI / 2, 0), 8));
scene_settings.set('cow.obj', new Camera(new V3(0, 10, 0), new V2(-Math.PI / 2, 0), 4));
scene_settings.set('pumpkin.obj', new Camera(new V3(0, 0, 0), new V2(-Math.PI / 2, 0), 30));
scene_settings.set('sphere.obj', new Camera(new V3(-10, 0, 0), new V2(0, 0), 3));
scene_settings.set('teapot.obj', new Camera(new V3(0, 7, 2), new V2(-Math.PI / 2, 0), 3));

function launch_scene(path) {
	if (curr_scene_path != path) {
		curr_scene_path = path;
		fetch(path)
			.then(response => response.text())
			.then(file_text => {
				let camera = scene_settings.has(path) ? scene_settings.get(path) : new Camera();
				render_loop(JSON.parse(JSON.stringify(camera)), new Scene(path, file_text), 0);
			});
	}
}

window.onload = function () {
	launch_scene('sphere.obj');
}