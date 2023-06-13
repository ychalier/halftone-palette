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


function get_property(obj, key, default_) {
    return (key in obj) ? obj[key] : default_;
}


class LagrangeInterpolation {

    /* Adapted from https://gist.github.com/dburner/8550030 */

    constructor(xys) {
        this.xs = [];
        this.ys = [];
        xys.forEach(xy => {
            this.xs.push(xy[0]);
            this.ys.push(xy[1]);
        });
        this.ws = [];
        let k = this.xs.length;
        let w;
        for (let j = 0; j < k; ++j) {
            w = 1;
            for (let i = 0; i < k; ++i) {
                if (i != j) {
                    w *= this.xs[j] - this.xs[i];
                }
            }
            this.ws[j] = 1 / w;
        }
    }

    f(x) {
        let a = 0;
        let b = 0;
        let c = 0;
        for (let j = 0; j < this.xs.length; ++j) {
            if (x != this.xs[j]) {
                a = this.ws[j] / (x - this.xs[j]);
                b += a * this.ys[j];
                c += a;
            } else {
                return this.ys[j];
            }
        }
        return b / c;
    }

}


class CurveInput {

    constructor(callback) {
        this.callback = callback;
        this.dots = [[0, 0], [1, 1]];
        this.canvas = null;
        this.context = null;
        this.size = 256;
        this.padding = 8;
        this.radius = 4;
        this.tol = 2 * this.radius / this.size;
        this.dragging = false;
        this.moving_dot = null;
    }

    cursor_position(event) {
        let bounds = this.canvas.getBoundingClientRect();
        return [
            Math.max(0, Math.min(1, (event.clientX - bounds.left - this.padding) / this.size)),
            1 - Math.max(0, Math.min(1, (event.clientY - bounds.top - this.padding) / this.size))
        ];
    }

    setup(container) {        
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.size + 2 * this.padding;
        this.canvas.height = this.size + 2 * this.padding;
        container.appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        this.context.fillStyle = "black";
        this.context.strokeStyle = "black";

        var self = this;
        
        this.canvas.addEventListener("mousedown", (event) => {
            self.dragging = true;
            let pos = self.cursor_position(event);
            for (let i = 0; i < self.dots.length; i++) {
                if (Math.abs(self.dots[i][0] - pos[0]) + Math.abs(self.dots[i][1] - pos[1]) <= self.tol) {
                    self.moving_dot = i;
                    break;
                }
            }
            if (self.moving_dot == null) {
                self.dots.push([pos[0], pos[1]]);
                self.dots.sort((a, b) => { return a[0] - b[0]; });
                for (let i = 0; i < self.dots.length; i++) {
                    if (self.dots[i][0] == pos[0] && self.dots[i][1] == pos[1]) {
                        self.moving_dot = i;
                        break;
                    }
                }
            }
            self.dots[self.moving_dot] == [pos[0], pos[1]];
            self.update();
        });

        this.canvas.addEventListener("mousemove", (event) => {
            if (!self.dragging) return;
            let pos = self.cursor_position(event);
            self.dots[self.moving_dot] = [pos[0], pos[1]];
            self.update();
        });

        this.canvas.addEventListener("mouseup", (event) => {
            self.dragging = false;
            self.moving_dot = null;
            self.update();
        });

        this.canvas.addEventListener("click", (event) => {
            if (!event.shiftKey) return;
            let pos = self.cursor_position(event);
            let remove_index = null;
            for (let i = 0; i < self.dots.length; i++) {
                if (Math.abs(self.dots[i][0] - pos[0]) + Math.abs(self.dots[i][1] - pos[1]) <= self.tol) {
                    remove_index = i;
                    break;
                }
            }
            if (remove_index != null) {
                self.dots.splice(remove_index, 1);
                self.update();
            }
        });

        this.canvas.addEventListener("dblclick", (event) => {
            self.dots = [[0, 0], [1, 1]];
            self.update();
        });

    }

    update(trigger_callback=true) {
        this.context.clearRect(0, 0, this.size + 2 * this.padding, this.size + 2 * this.padding);
        this.context.fillStyle = "black";
        this.dots.forEach(dot => {
            let x = dot[0] * this.size - this.radius + this.padding;
            let y = (1 - dot[1]) * this.size - this.radius + this.padding;
            this.context.fillRect(x, y, 2 * this.radius, 2 * this.radius);
        });

        let sdots = [...this.dots];
        if (sdots[0][0] != 0) {
            sdots.splice(0, 0, [0, 0]);
        }
        if (sdots[sdots.length - 1][0] != 1) {
            sdots.push([1, 1]);
        }

        let interpolation = new LagrangeInterpolation(sdots);
        this.context.beginPath();
        this.context.moveTo(this.padding, this.size + this.padding);

        for (let i = 0; i < this.size; i++) {
            let x = i / (this.size - 1);
            let y = interpolation.f(x);
            this.context.lineTo(
                x * this.size + this.padding,
                (1 - y) * this.size + this.padding
            );
        }
        this.context.stroke();
        
        if (trigger_callback) {
            this.callback(interpolation);
        }

    }

}


function create_parameter_input(ref, container, options, callback) {
    let group = document.createElement("div");
    group.classList.add("input-group");
    let label = document.createElement("label");
    label.textContent = options.label;
    group.appendChild(label);
    let input = null;
    let value_span = null;
    if (options.type == "range") {
        input = document.createElement("input");
        input.value = ref[options.attribute];
        input.type = "range";
        input.min = options.min;
        input.max = options.max;
        input.step = get_property(options, "step", 1);
        value_span = document.createElement("span");
    } else if (options.type == "color") {
        input = document.createElement("input");
        input.value = ref[options.attribute];
        input.type = "color";
    } else if (options.type == "boolean") {
        input = document.createElement("input");
        input.type = "checkbox";
        if (ref[options.attribute]) input.checked = true;
    } else if (options.type == "select") {
        input = document.createElement("select");
        options.options.forEach(option => {
            let option_element = document.createElement("option");
            option_element.value = option; //TODO: consider using option label/value
            option_element.textContent = option;
            if (ref[options.attribute] == option) {
                option_element.selected = true;
            }
            input.appendChild(option_element);
        });
    }
    group.appendChild(input);
    if (value_span != null) {
        value_span.textContent = ref[options.attribute];
        group.appendChild(value_span);
    }
    input.addEventListener("input", () => {
        let new_value = null;
        if (options.type == "range") {
            if (is_integer(input.step)) {
                new_value = parseInt(input.value);
            } else {
                new_value = parseFloat(input.value);
            }
        } else if (options.type == "color") {
            new_value = input.value;
        } else if (options.type == "boolean") {
            new_value = input.checked;
        } else if (options.type == "select") {
            input.querySelectorAll("option").forEach(option => {
                if (option.selected) {
                    new_value = option.value;
                }
            });
        }
        ref[options.attribute] = new_value;
        if (value_span != null) value_span.textContent = new_value;
        if (callback) callback();
    });
    container.appendChild(group);
}


function create_curve_input(ref, container, attribute, callback) {
    let curve_input = new CurveInput((interpolation) => {
        ref[attribute] = interpolation;
        callback();
    });
    curve_input.setup(container);
    curve_input.update(false);
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
    constructor(index, controller) {
        this.index = index;
        this.controller = controller;
        this.angle_degree = 30;
        this.grid_size = 16;
        this.raster_size = 1;
        this.show_grid = false;
        this.interlaced = true;
        this.oneline = false;
        this.dot_style = "circles";
        this.collapsed = false;
        this.color = "#000000";
        this.element = null;
        this.channel = "darkness";
        this.toggled = true;
        this.negative = false;
        this.tone_curve = new LagrangeInterpolation([[0, 0], [1, 1]]);
    }

    create_element() {
        this.element = document.createElement("div");
        this.element.classList.add("screen");
        document.getElementById("screens").appendChild(this.element);
        let delete_button = document.createElement("button");
        delete_button.textContent = "Delete";
        var self = this;
        delete_button.addEventListener("click", () => {
            self.element.parentElement.removeChild(self.element);
            self.controller.delete_screen(this.index);
        });
        this.element.appendChild(delete_button);
    }

    setup() {
        this.create_element();
        var self = this;
        let callback = () => { self.controller.update(); };
        create_parameter_input(self, this.element, {
            attribute: "toggled",
            label: "Toggle",
            type: "boolean"
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "angle_degree",
            label: "Angle",
            type: "range",
            min: 0,
            max: 90,
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "grid_size",
            label: "Grid size",
            type: "range",
            min: 4,
            max: 64,
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "interlaced",
            label: "Collapse",
            type: "boolean",
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "show_grid",
            label: "Show grid",
            type: "boolean",
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "oneline",
            label: "One line",
            type: "boolean",
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "collapsed",
            label: "Collapse",
            type: "boolean",
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "raster_size",
            label: "Dot size ratio",
            type: "range",
            min: 0,
            max: 2,
            step: 0.1
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "color",
            label: "Dot color",
            type: "color",
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "dot_style",
            label: "Dot style",
            type: "select",
            options: ["pixelated_dots", "euclidean", "circles", "ellipsis", "hexagons"]
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "channel",
            label: "Channel",
            type: "select",
            options: ["darkness", "red", "green", "blue", "yellow", "magenta", "cyan"]
        }, callback);
        create_parameter_input(self, this.element, {
            attribute: "negative",
            label: "Negative",
            type: "boolean",
        }, callback);
        create_curve_input(self, this.element, "tone_curve", callback);
    }

    draw() {
        if (!this.toggled || this.raster_size == 0) return;
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
                
                let intensity = this.controller.intensity_at(x, y, this.channel);
                intensity = Math.max(0, Math.min(1, this.tone_curve.f(intensity)));
                if (this.negative) {
                    intensity = 1 - intensity;
                }

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
        this.debug = false;
        this.screens = [];
    }

    setup() {
        this.load_original_image();
        let container = document.getElementById("commands");
        var self = this;
        let callback = () => { self.update(); };
        create_parameter_input(self, container, {
            attribute: "noise_level",
            label: "Noise",
            type: "range",
            min: 0,
            max: 1,
            step: 0.01
        }, callback);
        create_parameter_input(self, container, {
            attribute: "debug",
            label: "Use debugging gradient",
            type: "boolean",
        }, callback);
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

    intensity_at(x, y, channel) {
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
        if (channel == "darkness") {
            return 1 - (r + g + b) / 3;
        } else if (channel == "red") {
            return r;
        } else if (channel == "green") {
            return g ;
        } else if (channel == "blue") {
            return b;
        } else if (channel == "yellow") {
            return (r + g) / 2;
        } else if (channel == "magenta") {
            return (r + b) / 2;
        } else if (channel == "cyan") {
            return (g + b) / 2;
        }
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
        let screen = new Screen(this.screens.length, this);
        screen.setup();
        this.screens.push(screen);
    }

    delete_screen(index) {
        let delete_index = null;
        for (let i = 0; i < this.screens.length; i++) {
            if (this.screens[i].index == index) {
                delete_index = i;
                break;
            }
        }
        if (delete_index == null) return;
        this.screens.splice(delete_index, 1);
        this.update();
    }

}

window.addEventListener("load", () => {
    let controller = new Controller("canvas", 512, 512);
    controller.setup();
    controller.add_screen();
    controller.update();
    document.getElementById("button-add-screen").addEventListener("click", () => {
        controller.add_screen();
    });
    
});