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


var input_counter = 0;


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
        this.update_weights();
    }

    update_weights() {
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

    export_config() {
        return {
            xs: this.xs,
            ys: this.ys,
        }
    }

    load_config(config) {
        this.xs = config.xs;
        this.ys = config.ys;
        this.update_weights();
    }

}


class CurveInput {

    constructor(callback) {
        this.callback = callback;
        this.dots = [[0, 0], [1, 1]];
        this.canvas = null;
        this.context = null;
        this.size = 224;
        this.padding = 16;
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
        this.context.fillStyle = "white";
        this.context.strokeStyle = "white";

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

        this.canvas.addEventListener("mouseleave", (event) => {
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
    if (options.type == "boolean") {
        group.classList.add("input-group-boolean");
    }
    input_counter++;
    let input_id = `input-${input_counter}`;
    let label = document.createElement("label");
    label.textContent = options.label;
    label.setAttribute("for", input_id);
    group.appendChild(label);
    let input = null;
    let value_span = null;
    if (options.type == "range") {
        input = document.createElement("input");
        input.type = "range";
        input.min = options.min;
        input.max = options.max;
        input.step = get_property(options, "step", 1);
        input.value = ref[options.attribute];
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
    input.id = input_id;
    group.appendChild(input);
    if (value_span != null) {
        value_span.textContent = ` (${ref[options.attribute]})`;
        label.appendChild(value_span);
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
        if (value_span != null) value_span.textContent = ` (${new_value})`;
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
    curve_input.dots = [];
    for (let i = 0; i < ref[attribute].xs.length; i++) {
        let x = ref[attribute].xs[i];
        let y = ref[attribute].ys[i];
        curve_input.dots.push([x, y]);
    }
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


const DOTS_TEXTURE_PACK = create_pixelated_dots_texture_pack(10);
const EUCLIDEAN_TEXTURE_PACK = create_pixelated_euclidean_dots_texture_pack(10);
var COPIED_STRING = null;


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
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
    }

    export_config() {
        return {
            index: this.index,
            angle_degree: this.angle_degree,
            grid_size: this.grid_size,
            raster_size: this.raster_size,
            show_grid: this.show_grid,
            interlaced: this.interlaced,
            oneline: this.oneline,
            dot_style: this.dot_style,
            collapsed: this.collapsed,
            color: this.color,
            channel: this.channel,
            toggled: this.toggled,
            negative: this.negative,
            tone_curve: this.tone_curve.export_config(),
        };
    }

    load_config(config) {
        this.index = config.index;
        this.angle_degree = config.angle_degree;
        this.grid_size = config.grid_size;
        this.raster_size = config.raster_size;
        this.show_grid = config.show_grid;
        this.interlaced = config.interlaced;
        this.online = config.online;
        this.dot_style = config.dot_style;
        this.collapsed = config.collapsed;
        this.color = config.color;
        this.channel = config.channel;
        this.toggled = config.toggled;
        this.negative = config.negative;
        this.tone_curve.load_config(config.tone_curve);
    }

    create_element() {
        this.element = document.createElement("div");
        this.element.classList.add("screen");
        document.getElementById("config").appendChild(this.element);
        
        var self = this;
        
        let delete_button = document.createElement("button");
        delete_button.textContent = "Delete";
        delete_button.addEventListener("click", () => {
            self.controller.delete_screen(this.index);
        });
        this.element.appendChild(delete_button);

        let copy_button = document.createElement("button");
        copy_button.textContent = "Copy";
        copy_button.addEventListener("click", () => {
            COPIED_STRING = JSON.stringify(self.export_config());
            navigator.clipboard.writeText(COPIED_STRING);
        });
        this.element.appendChild(copy_button);

        let paste_button = document.createElement("button");
        paste_button.textContent = "Paste";
        paste_button.addEventListener("click", () => {
            if (COPIED_STRING != null) {
                let config = JSON.parse(COPIED_STRING);
                self.load_config(config);
                self.element.parentElement.removeChild(self.element);
                self.setup();
            }
        });
        this.element.appendChild(paste_button);
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
            label: "Interlaced",
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
        this.canvas.width = this.controller.width;
        this.canvas.height = this.controller.height;
        this.context.clearRect(0, 0, this.controller.width, this.controller.height);

        if (!this.toggled || this.raster_size == 0) return;

        this.context.fillStyle = this.color;
        let angle = this.angle_degree / 180 * Math.PI;
        let x_center = this.controller.width / 2;
        let y_center = this.controller.height / 2;
        let grid_width = this.controller.width / this.grid_size;
        let grid_height = this.controller.height / this.grid_size / (this.collapsed ? this.raster_size : 1);

        let row_start = -grid_height;
        let row_end = 2 * grid_height;
        let col_start = -grid_width;
        let col_end = 2 * grid_width;
        if (this.oneline) {
            row_start = Math.floor(grid_height / 2);
            row_end = row_start + 1;
        }
        for (let i = row_start; i < row_end; i++) {
            for (let j = col_start; j < col_end; j++) {
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

                if (x < 0 || x >= this.controller.width || y < 0 || y >= this.controller.height) {
                    continue;
                }
            
                if (this.show_grid) {
                    this.context.strokeStyle = "black";
                    draw_rotated_square(this.context, x, y, this.grid_size, angle);
                    this.context.stroke();
                }
                
                let intensity = this.controller.intensity_at(x, y, this.channel);
                intensity = Math.max(0, Math.min(1, this.tone_curve.f(intensity)));
                if (this.negative) {
                    intensity = 1 - intensity;
                }

                let radius = intensity * this.grid_size / 2 * this.raster_size;

                if (this.dot_style == "circles") {
                    this.context.beginPath();
                    this.context.arc(x, y, radius, 0, 2 * Math.PI);
                    this.context.fill();
                } else if (this.dot_style == "euclidean") {
                    let texture_index = Math.round(intensity * (EUCLIDEAN_TEXTURE_PACK.length - 1));
                    let texture = EUCLIDEAN_TEXTURE_PACK[texture_index];
                    texture.draw(this.context, x, y, this.grid_size * this.raster_size, angle);
                } else if (this.dot_style == "pixelated_dots") {
                    let texture_index = Math.round(intensity * (DOTS_TEXTURE_PACK.length - 1));
                    let texture = DOTS_TEXTURE_PACK[texture_index];
                    texture.draw(this.context, x, y, this.grid_size * this.raster_size, angle);
                } else if (this.dot_style == "ellipsis") {
                    this.context.beginPath();
                    this.context.ellipse(x, y, radius, radius*0.5, -Math.PI / 4, 0, 2 * Math.PI);
                    this.context.fill();
                } else if (this.dot_style == "hexagons") {
                    let n = 6;
                    let angle_offset = Math.PI / 6;
                    // let angle_offset = 3 * Math.PI / 2; // Math.PI / n;
                    // if (i % 2 == 0) angle_offset -= Math.PI;
                    this.context.beginPath();
                    this.context.moveTo(x + radius * Math.cos(angle_offset), y + radius* Math.sin(angle_offset));
                    for (let k = 0; k <= n; k++) {
                        this.context.lineTo(x + radius * Math.cos(2 * k * Math.PI / n + angle_offset), y + radius * Math.sin(2 * k * Math.PI / n + angle_offset));
                    }
                    this.context.fill();
                }
    
            }
        }

    }

    get_data() {
        return this.context.getImageData(0, 0, this.controller.width, this.controller.height).data;
    }

}


const LOCAL_STORAGE_KEY = "halftone_palette_config";


function compose_normal(lower_layer, upper_layer, k, smooth) {
    let a = upper_layer[k + 3] / 255;
    if (!smooth) a = a > 0 ? 1 : 0;
    let b = 1 - a;
    lower_layer[k] = b * lower_layer[k] + a * upper_layer[k];
    lower_layer[k + 1] = b * lower_layer[k + 1] + a * upper_layer[k + 1];
    lower_layer[k + 2] = b * lower_layer[k + 2] + a * upper_layer[k + 2];
}


function compose_additive(lower_layer, upper_layer, k, smooth) {
    let a = upper_layer[k + 3] / 255;
    if (!smooth) a = a > 0 ? 1 : 0;
    lower_layer[k] = Math.min(255, lower_layer[k] + a * upper_layer[k]);
    lower_layer[k + 1] = Math.min(255, lower_layer[k + 1] + a * upper_layer[k + 1]);
    lower_layer[k + 2] = Math.min(255, lower_layer[k + 2] + a * upper_layer[k + 2]);
}


function compose_subtractive(lower_layer, upper_layer, k, smooth) {
    let a = upper_layer[k + 3] / 255;
    if (!smooth) a = a > 0 ? 1 : 0;
    for (let l = k; l < k+3; l++) {
        let base_color = 255 * (1 - a) + upper_layer[l] * a;
        lower_layer[l] = Math.max(0, lower_layer[l] - (255 - base_color));
    }
}


class Controller {

    constructor(canvas_id, size) {
        this.canvas = document.getElementById(canvas_id);
        this.size = size;
        this.width = this.size;
        this.height = this.size;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context = this.canvas.getContext("2d");
        this.source = null;
        this.noise_level = 0;
        this.debug = false;
        this.smooth = true;
        this.grey_noise = true;
        this.background = "#ffffff";
        this.composition_mode = "normal";
        this.screens = [];
    }

    export_config() {
        let screen_configs = [];
        this.screens.forEach(screen => {
            screen_configs.push(screen.export_config());
        })
        return {
            size: this.size,
            noise_level: this.noise_level,
            debug: this.debug,
            smooth: this.smooth,
            screens: screen_configs,
            grey_noise: this.grey_noise,
        }
    }

    save_config_to_storage() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.export_config()));
    }

    load_config(config) {
        console.log("Loading config", config);
        this.size = config.size;
        this.noise_level = config.noise_level;
        this.grey_noise = config.grey_noise;
        this.debug = config.debug;
        this.smooth = config.smooth;
        for (let i = this.screens.length - 1; i >= 0; i--) {
            this.delete_screen_at(i);
        }
        config.screens.forEach(screen_config => {
            let screen = new Screen(this.screens.length, this);
            screen.load_config(screen_config);
            screen.setup();
            this.screens.push(screen);
        });
    }

    load_config_from_storage() {
        let config_string = localStorage.getItem(LOCAL_STORAGE_KEY);
        console.log(config_string);
        if (config_string != null) {
            this.load_config(JSON.parse(config_string));
        }
    }

    setup() {
        let container = document.getElementById("commands");
        var self = this;
        let callback = () => { self.update(); };
        create_parameter_input(self, container, {
            attribute: "noise_level",
            label: "Output noise",
            type: "range",
            min: 0,
            max: 1,
            step: 0.01
        }, callback);
        create_parameter_input(self, container, {
            attribute: "grey_noise",
            label: "Grayscale noise",
            type: "boolean",
        }, callback);
        create_parameter_input(self, container, {
            attribute: "debug",
            label: "Use debugging gradient",
            type: "boolean",
        }, callback);
        create_parameter_input(self, container, {
            attribute: "smooth",
            label: "Smooth",
            type: "boolean",
        }, callback);
        create_parameter_input(self, container, {
            attribute: "background",
            label: "Background color",
            type: "color"
        }, callback);
        create_parameter_input(self, container, {
            attribute: "composition_mode",
            label: "Composition mode",
            type: "select",
            options: ["normal", "additive", "subtractive"],
        }, callback)
    }

    intensity_at(x, y, channel) {
        if (this.debug) {
            return Math.max(0, Math.min(1, x / this.width));
        }
        if (this.source == null) return 0;

        let image_scale = this.size / this.source.size;
        let i = Math.floor(y / image_scale);
        let j = Math.floor(x / image_scale);

        let color = this.source.color_at(i, j);

        if (color.alpha == 0) return 0;
        return color[channel];
    }

    update() {
        this.save_config_to_storage();
        if (this.source != null) {
            this.width = this.source.width;
            this.height = this.source.height;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
        this.screens.forEach(screen => {
            screen.draw();
        });
        this.compose();
    }

    compose() {
        this.context.fillStyle = this.background;
        this.context.fillRect(0, 0, this.width, this.height);
        let imagedata = this.context.getImageData(0, 0, this.width, this.height);
        let composition_function = compose_normal;
        if (this.composition_mode == "additive") {
            composition_function = compose_additive;
        } else if (this.composition_mode == "subtractive") {
            composition_function = compose_subtractive;
        }
        this.screens.forEach(screen => {
            let screen_data = screen.get_data();
            for (let i = 0; i < this.height; i++) {
                for (let j = 0; j < this.width; j++) {
                    let k = (i * this.width + j) * 4;
                    composition_function(imagedata.data, screen_data, k, this.smooth);
                }
            }
        });
        if (this.noise_level > 0) {
            for (let i = 0; i < this.height; i++) {
                for (let j = 0; j < this.width; j++) {
                    let k = (i * this.width + j) * 4;
                    let noise = null;
                    if (this.grey_noise) {
                        let noise_value = Math.floor(Math.random() * 256);
                        noise = [noise_value, noise_value, noise_value];
                    } else {
                        noise = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)];
                    }
                    for (let l = k; l < k + 3; l++) {
                        imagedata.data[l] = (1 - this.noise_level) * imagedata.data[l] + this.noise_level * noise[l - k];
                    }
                }
            }
        }
        this.context.putImageData(imagedata, 0, 0);
    }

    add_screen(should_update=true) {
        let screen = new Screen(this.screens.length, this);
        screen.setup();
        this.screens.push(screen);
        if (should_update) this.update();
    }

    delete_screen(index) {
        let delete_index = null;
        for (let i = 0; i < this.screens.length; i++) {
            if (this.screens[i].index == index) {
                delete_index = i;
                break;
            }
        }
        this.delete_screen_at(delete_index);
    }

    delete_screen_at(i) {
        if (i == null) return;
        this.screens[i].element.parentElement.removeChild(this.screens[i].element);
        this.screens.splice(i, 1);
        this.update();
    }

    export() {
        window.open(this.canvas.toDataURL("image/png"), "_blank").focus();
    }

}


class SourceImage {

    constructor(size, callback) {
        this.canvas = document.getElementById("original");
        this.image = new Image();
        this.image.crossOrigin = "anonymous";
        this.size = size;
        this.width = size;
        this.height = size;
        var self = this;
        this.image.addEventListener("load", () => { self.on_image_load(); });
        this.data = null;
        this.callback = callback;
    }

    on_image_load() {
        let aspect_ratio = this.image.width / this.image.height;
        if (aspect_ratio >= 1) {
            this.width = this.size;
            this.height = Math.floor(this.size / aspect_ratio);
        } else {
            this.width = Math.floor(this.size * aspect_ratio);
            this.height = this.size;
        }
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        let context = this.canvas.getContext("2d");
        context.drawImage(this.image, 0, 0, this.width, this.height);
        this.data = context.getImageData(0, 0, this.width, this.height).data;
        this.callback();
    }

    load_url(url) {
        this.image.src = url;
    }

    color_at(i, j) {
        let color = {
            red: 0,
            green: 0,
            blue: 0,
            brightness: 0,
            darkness: 0,
            cyan: 0,
            magenta: 0,
            yellow: 0,
            black: 0,
            alpha: 0,
        }
        if (i < 0 || i >= this.height || j < 0 || j >= this.width) {
            return color;
        }
        let k = ((i * this.width) + j) * 4;
        color.red = this.data[k] / 255;
        color.green = this.data[k + 1] / 255;
        color.blue = this.data[k + 2] / 255;
        color.alpha = this.data[k + 3] / 255;
        color.brightness = (color.red + color.green + color.blue) / 3;
        color.darkness = 1 - color.brightness;
        color.cyan = 1 - color.red;
        color.magenta = 1 - color.green;
        color.yellow = 1 - color.blue;
        return color;
    }

}


window.addEventListener("load", () => {
    let controller = new Controller("canvas", 512, 512);
    controller.add_screen(should_update=false);
    controller.load_config_from_storage();
    controller.setup();
    let source = new SourceImage(512, () => {
        controller.update();
    });
    controller.source = source;
    source.load_url("mountain.jpg");
    document.getElementById("button-add-screen").addEventListener("click", () => { controller.add_screen(); });
    document.getElementById("button-export").addEventListener("click", () => { controller.export(); });
    document.getElementById("input-image").addEventListener("change", () => {
        let image_files = document.getElementById("input-image").files;
        if (image_files.length > 0) {
            console.log("Loading image from a file:", image_files[0]);
            source.load_url(URL.createObjectURL(image_files[0]));
        } else {
            alert("Please specify one source!");
            return;
        }
    });
});