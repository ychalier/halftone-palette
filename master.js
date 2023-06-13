function rotated_square(size, angle) {
    let half_size = size / 2;
    let corners = [
        [-half_size, -half_size],
        [-half_size, +half_size],
        [+half_size, +half_size],
        [+half_size, -half_size],
    ];
    let rotated = [];
    for (let k = 0; k < 4; k++) {
        let cx = corners[k][0];
        let cy = corners[k][1];
        let rx = cx * Math.cos(angle) + cy * Math.sin(angle);
        let ry = -cx * Math.sin(angle) + cy * Math.cos(angle);
        rotated.push([rx, ry]);
    }
    return rotated;
}

function draw_rotated_square(context, cx, cy, size, angle) {
    let square = rotated_square(size, angle);
    context.beginPath();
    context.moveTo(square[0][0] + cx, square[0][1] + cy);
    for (let k = 1; k <= 4; k++) {
        context.lineTo(square[k % 4][0] + cx, square[k % 4][1] + cy);
    }
}

function is_integer(x) {
    return Math.floor(x) == x;
}


class Texture {

    constructor(size, relsize) {
        this.size = size;
        this.relsize = relsize;
        this.grid = [];
        for (let i = 0; i < this.size; i++) {
            this.grid.push([]);
            for (let j = 0; j < this.size; j++) {
                this.grid[i].push(0);
            }
        }
    }

    draw(context, x, y, grid_size, angle) {
        let scale = grid_size / this.size * this.relsize;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] == 0) {
                    continue;
                }
                let cx_base = x + (j - this.size / 2 + .5) * scale;
                let cy_base = y + (i - this.size / 2 + .5) * scale;
                let cx = (cx_base - x) * Math.cos(angle) + (cy_base - y) * Math.sin(angle) + x;
                let cy = -(cx_base - x) * Math.sin(angle) + (cy_base - y) * Math.cos(angle) + y;
                draw_rotated_square(context, cx, cy, scale, angle);
                context.fill();
            }
        }
    }

}


function create_pixelated_dots_texture_pack(dot_size) {
    // Requires a symmetric 2D function
    let grid = [];
    for (let k = 0; k < dot_size; k++) {
        for (let l = 0; l < dot_size; l++) {
            let i = k - dot_size / 2;
            let j = l - dot_size / 2;
            //let strength = Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2)) - Math.sqrt(Math.pow(i, -4) + Math.pow(j, -4));
            let strength = Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2));
            grid.push([k, l, strength]);
        }
    }
    grid.sort((a, b) => { return a[2] - b[2]; });
    let texture_pack = [];
    for (let bound = 0; bound <= dot_size * dot_size; bound++) {
        let texture = new Texture(dot_size, 1);
        for (let m = 0; m < bound; m++) {
            let k = grid[m][0];
            let l = grid[m][1];
            texture.grid[k][l] = 1;
        }
        texture_pack.push(texture);
    }
    return texture_pack;
}


function create_pixelated_euclidean_dots_texture_pack(dot_size) {
    // Euclidean
    let texture_pack = [];
    for (let bound = 0; bound <= dot_size * dot_size; bound++) {
        let intensity = bound / dot_size / dot_size;
        let p = 2 + 0 * Math.exp(-Math.pow(intensity - 0.5, 2) / 0.005);
        let grid = [];
        for (let k = 0; k < dot_size; k++) {
            for (let l = 0; l < dot_size; l++) {
                let i = k - dot_size / 2;
                let j = l - dot_size / 2;
                let strength = Math.pow(Math.pow(i, p) + Math.pow(j, p), 1/p);
                grid.push([k + dot_size, l + dot_size, strength]);
            }
        }
        grid.sort((a, b) => { return a[2] - b[2]; });

        let texture = new Texture(3 * dot_size, 3);
        let hds = dot_size / 2;
    
        if (bound < dot_size * dot_size / 2) {
            for (let m = 0; m < bound * 2; m++) {
                let k = grid[m][0];
                let l = grid[m][1];
                texture.grid[k][l] = 1;
            }
        } else {
            for (let k = dot_size; k < 2*dot_size; k++) {
                for (let l = dot_size; l < 2*dot_size; l++) {
                    texture.grid[k][l] = 1;
                }
            }
            let offset_bound = dot_size * dot_size - bound;
            for (let m = offset_bound * 2; m < grid.length; m++) {
                let k = grid[m][0];
                let l = grid[m][1];
                let kk = k - dot_size;
                let ll = l - dot_size;
                if (kk >= hds) texture.grid[k - dot_size][l] = 1;
                if (kk <= hds) texture.grid[k + dot_size][l] = 1;
                if (ll >= hds) texture.grid[k][l - dot_size] = 1;
                if (ll <= hds) texture.grid[k][l + dot_size] = 1;
                if (kk >= hds && ll >= hds) texture.grid[k - dot_size][l - dot_size] = 1;
                if (kk >= hds && ll <= hds) texture.grid[k - dot_size][l + dot_size] = 1;
                if (kk <= hds && ll >= hds) texture.grid[k + dot_size][l - dot_size] = 1;
                if (kk <= hds && ll <= hds) texture.grid[k + dot_size][l + dot_size] = 1;
            }
        }

        texture_pack.push(texture);
    }
    return texture_pack;
}


class Screen {
    constructor(controller) {
        this.controller = controller;
        this.angle_degree = 30;
        this.grid_size = 16;
        this.raster_size = 1;
        this.show_grid = false;
        this.interlaced = true;
        this.debug = false;
        this.oneline = false;
        this.dot_style = "circles";
        this.collapsed = false;
        this.color = "red";
        this.element = null;
    }

    create_element() {
        this.element = document.createElement("div");
        this.element.classList.add("screen");
        document.getElementById("screens").appendChild(this.element);
    }

    setup() {
        this.create_element();
        this.add_range_parameter_input("angle_degree", 0, 90, 1);
        this.add_range_parameter_input("grid_size", 8, 64, 1);
        this.add_checkbox_parameter_input("collapsed");
        this.add_range_parameter_input("raster_size", 0.1, 2, 0.1);
        this.add_checkbox_parameter_input("interlaced");
        this.add_checkbox_parameter_input("show_grid");
        this.add_checkbox_parameter_input("debug");
        this.add_checkbox_parameter_input("oneline");
        this.add_select_parameter_input("dot_style", ["pixelated_dots", "euclidean", "circles", "ellipsis", "hexagons"]);
    }

    add_range_parameter_input(parameter, min, max, step) {
        let container = this.element;
        let group = document.createElement("div");
        let label = document.createElement("label");
        let input = document.createElement("input");
        let span = document.createElement("span");
        label.textContent = parameter;
        var self = this;
        input.type = "range";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = this[parameter];
        input.addEventListener("input", () => {
            span.textContent = input.value;
            if (is_integer(step)) {
                self[parameter] = parseInt(input.value);
            } else {
                self[parameter] = parseFloat(input.value);
            }
            self.controller.update();
        });
        span.textContent = this[parameter];
        group.appendChild(label);
        group.appendChild(input);
        group.appendChild(span);
        container.appendChild(group);
        this.image_width = null;
        this.image_height = null;
        this.image_data = [];
    }

    add_checkbox_parameter_input(parameter) {
        let container = this.element;
        let group = document.createElement("div");
        let label = document.createElement("label");
        let input = document.createElement("input");
        input.type = "checkbox";
        label.textContent = parameter;
        var self = this;
        if (this[parameter]) {
            input.checked = true;
        }
        input.addEventListener("input", () => {
            self[parameter] = input.checked;
            self.controller.update();
        });
        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);
    }

    add_select_parameter_input(parameter, options) {
        let container = this.element;
        let group = document.createElement("div");
        let label = document.createElement("label");
        let input = document.createElement("select");
        label.textContent = parameter;
        options.forEach(option_text => {
            let option = document.createElement("option");
            option.textContent = option_text;
            if (this[parameter] == option_text) {
                option.selected = true;
            }
            input.appendChild(option);
        });
        
        var self = this;
        input.addEventListener("input", () => {
            input.querySelectorAll("option").forEach(option => {
                if (option.selected) {
                    self[parameter] = option.value;
                }
            });
            self.controller.update();
        });
        group.appendChild(label);
        group.appendChild(input);
        container.appendChild(group);
    }

    draw() {
        this.controller.context.fillStyle = this.color;
        let angle = this.angle_degree / 180 * Math.PI;
        let x_center = this.controller.width / 2;
        let y_center = this.controller.height / 2;
        let grid_width = this.controller.width / this.grid_size;
        let grid_height = this.controller.height / this.grid_size / (this.collapsed ? this.raster_size : 1);
        let dots_texture_pack = create_pixelated_dots_texture_pack(10);
        let euclidean_texture_pack = create_pixelated_euclidean_dots_texture_pack(10);

        let row_start = -Math.floor(grid_height / 4);
        let row_end = 1.25 * grid_height;
        if (this.oneline) {
            row_start = Math.floor(grid_height / 2);
            row_end = row_start + 1;
        }
        for (let i = row_start; i < row_end; i++) {
            for (let j = -Math.floor(grid_width / 4); j < 1.25 * grid_width; j++) {
                let y_base = i * this.grid_size + .5 * this.grid_size;
                if (this.collapsed) {
                    y_base = i * this.grid_size * this.raster_size + .5 * this.grid_size * this.raster_size;
                }
                let x_base = j * this.grid_size + .5 * this.grid_size;
                if (this.interlaced) {
                    x_base += i % 2 * .5 * this.grid_size;
                }
                let x = Math.cos(angle) * (x_base - x_center) + Math.sin(angle) * (y_base - y_center) + x_center;
                let y = -Math.sin(angle) * (x_base - x_center) + Math.cos(angle) * (y_base - y_center) + y_center;
            
                if (this.show_grid) {
                    this.controller.context.strokeStyle = "black";
                    draw_rotated_square(this.controller.context, x, y, this.grid_size, angle);
                    this.controller.context.stroke();
                }
                
                let intensity = this.controller.intensity_at(x, y);

                let radius = intensity * this.grid_size / 2 * this.raster_size;

                if (this.dot_style == "circles") {
                    this.controller.context.beginPath();
                    this.controller.context.arc(x, y, radius, 0, 2 * Math.PI);
                    this.controller.context.fill();
                } else if (this.dot_style == "euclidean") {
                    let texture_index = Math.round(intensity * (euclidean_texture_pack.length - 1));
                    let texture = euclidean_texture_pack[texture_index];
                    texture.draw(this.controller.context, x, y, this.grid_size * this.raster_size, angle);
                } else if (this.dot_style == "pixelated_dots") {
                    let texture_index = Math.round(intensity * (dots_texture_pack.length - 1));
                    let texture = dots_texture_pack[texture_index];
                    texture.draw(this.controller.context, x, y, this.grid_size * this.raster_size, angle);
                } else if (this.dot_style == "ellipsis") {
                    this.controller.context.beginPath();
                    this.controller.context.ellipse(x, y, radius, radius*0.5, -Math.PI / 4, 0, 2 * Math.PI);
                    this.controller.context.fill();
                } else if (this.dot_style == "hexagons") {
                    let n = 6;
                    let angle_offset = Math.PI / 6;
                    // let angle_offset = 3 * Math.PI / 2; // Math.PI / n;
                    // if (i % 2 == 0) angle_offset -= Math.PI;
                    this.controller.context.beginPath();
                    this.controller.context.moveTo(x + radius * Math.cos(angle_offset), y + radius* Math.sin(angle_offset));
                    for (let k = 0; k <= n; k++) {
                        this.controller.context.lineTo(x + radius * Math.cos(2 * k * Math.PI / n + angle_offset), y + radius * Math.sin(2 * k * Math.PI / n + angle_offset));
                    }
                    this.controller.context.fill();
                }
    
            }
        }
    }

}


class Controller {

    constructor(canvas_id, width, height) {
        this.canvas = document.getElementById(canvas_id);
        this.width = width;
        this.height = height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context = this.canvas.getContext("2d");
        
        this.noise_level = 0;
        this.screens = [];
    }

    setup() {
        //this.add_range_parameter_input("noise_level", 0, 1, 0.01);
        this.load_original_image();
    }

    load_original_image() {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        let img = document.getElementById("original");
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0 );
        this.image_width = img.width;
        this.image_height = img.height;
        this.image_data = context.getImageData(0, 0, img.width, img.height);
    }

    intensity_at(x, y) {
        if (this.debug) {
            return Math.max(0, Math.min(1, x / this.width));
        }
        let image_aspect_ratio = this.image_width / this.image_height;
        let canvas_aspect_ratio = this.width / this.height;
        let image_scale = 1;
        let offset_x = 0;
        let offset_y = 0;
        if (image_aspect_ratio <= canvas_aspect_ratio) {
            image_scale = this.height / this.image_height;
            offset_x = (this.width - (this.image_width * image_scale)) / 2;
        } else {
            image_scale = this.width / this.image_width;
            offset_y = (this.height - (this.image_height * image_scale)) / 2;
        }
        let i = Math.floor((y - offset_y) / image_scale);
        let j = Math.floor((x - offset_x) / image_scale);

        if (i < 0 || i >= this.image_height || j < 0 || j >= this.image_width) {
            return 0;
        }
        let k = (i * this.image_width + j) * 4;
        if (k < 0 || k >= this.image_data.data.length) {
            return 0;
        }
        let r = this.image_data.data[k] / 255;
        let g = this.image_data.data[k + 1] / 255;
        let b = this.image_data.data[k + 2] / 255;
        let intensity = (r + g + b) / 3;
        return 1 - intensity;
    }

    draw_screens() {
        this.screens.forEach(screen => {
            screen.draw();
        });
    }

    apply_noise() {
        let image_data = this.context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                let noise = Math.floor(Math.random() * 256);
                let k = (i * this.width + j) * 4;
                if (!image_data.data[k + 3]) {
                    image_data.data[k] = (1 - this.noise_level) * 255 + this.noise_level * noise;
                    image_data.data[k + 1] = (1 - this.noise_level) * 255 + this.noise_level * noise;
                    image_data.data[k + 2] = (1 - this.noise_level) * 255 + this.noise_level * noise;
                } else {
                    image_data.data[k] = (1 - this.noise_level) * image_data.data[k] + this.noise_level * noise;
                    image_data.data[k + 1] = (1 - this.noise_level) * image_data.data[k + 1] + this.noise_level * noise;
                    image_data.data[k + 2] = (1 - this.noise_level) * image_data.data[k + 2] + this.noise_level * noise;
                }
                image_data.data[k + 3] = 255;
            }
        }
        this.context.putImageData(image_data, 0, 0);
    }

    update() {
        this.context.clearRect(0, 0, this.width, this.height);
        this.draw_screens();
        this.apply_noise();
    }

    add_screen() {
        let screen = new Screen(this);
        screen.setup();
        this.screens.push(screen);
    }

}

window.addEventListener("load", () => {
    let controller = new Controller("canvas", 512, 512);
    controller.setup();
    controller.add_screen();
    controller.screens[0].color = "black";
    controller.add_screen();
    controller.screens[1].color = "blue";
    controller.update();
});