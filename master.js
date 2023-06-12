
function draw_circular_dot(context, cx, cy, size, intensity) {
    let grid = [];
    for (let k = 0; k < size; k++) {
        for (let l = 0; l < size; l++) {
            let radius = Math.sqrt(Math.pow(k - size / 2, 2) + Math.pow(l - size / 2, 2));
            grid.push([k, l, radius]);
        }
    }
    grid.sort((a, b) => { return a[2] - b[2]; });
    
    let bound = intensity * size * size;

    for (let m = 0; m < bound; m++) {
        let k = grid[m][0];
        let l = grid[m][1];
        let mx = Math.floor(cx + l);
        let my = Math.floor(cy + k);
        context.fillRect(mx, my, 1, 1);
    }
}

class Texture {
    constructor(size) {
        this.size = size;
        this.grid = [];
        for (let i = 0; i < this.size; i++) {
            this.grid.push([]);
            for (let j = 0; j < this.size; j++) {
                this.grid[i].push(0);
            }
        }
    }

    draw(context, x, y, grid_size, angle) {
        let scale = grid_size / this.size;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] == 0) {
                    continue;
                }
                //context.beginPath();
                let sr = .6 * scale;
                let cx_base = x + (j - this.size / 2 + .5) * scale;
                let cy_base = y + (i - this.size / 2 + .5) * scale;
                
                let cx = (cx_base - x) * Math.cos(angle) + (cy_base - y) * Math.sin(angle) + x;
                let cy = -(cx_base - x) * Math.sin(angle) + (cy_base - y) * Math.cos(angle) + y;
                
                //context.arc(cx, cy, 1, 0, 2 * Math.PI);
                //context.fill();
                
                context.beginPath();
                let square_coordinates = [
                    [cx + sr, cy + sr],
                    [cx + sr, cy - sr],
                    [cx - sr, cy - sr],
                    [cx - sr, cy + sr],
                ];
                let rotated_square_coordinates = [];
                for (let k = 0; k < 4; k++) {
                    let sx = square_coordinates[k][0];
                    let sy = square_coordinates[k][1];
                    
                    rotated_square_coordinates.push([
                        (sx - cx) * Math.cos(angle) + (sy - cy) * Math.sin(angle) + cx,
                        -(sx - cx) * Math.sin(angle) + (sy - cy) * Math.cos(angle) + cy
                    ]);
                    
                    //rotated_square_coordinates.push([sx, sy]);
                }
                context.moveTo(rotated_square_coordinates[0][0], rotated_square_coordinates[0][1]);
                for (let k = 1; k <= rotated_square_coordinates.length; k++) {
                    context.lineTo(rotated_square_coordinates[k % rotated_square_coordinates.length][0], rotated_square_coordinates[k % rotated_square_coordinates.length][1]);
                }
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
            // let radius = Math.sqrt(Math.pow(k - dot_size / 2, 2) + Math.pow(l - dot_size / 2, 2));
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
        let texture = new Texture(dot_size, dot_size);
        for (let m = 0; m < bound; m++) {
            let k = grid[m][0];
            let l = grid[m][1];
            texture.grid[k][l] = 1;
        }
        texture_pack.push(texture);
    }
    return texture_pack;
}


class Controller {

    constructor(canvas_id, width, height) {
        this.canvas = document.getElementById(canvas_id);
        this.width = width;
        this.height = height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context = this.canvas.getContext("2d");
        
        this.angle_degree = 30;
        this.grid_size = 16;
        this.noise_level = 0;

    }

    add_parameter_input(parameter, min, max, step) {
        let container = document.getElementById("commands");
        let group = document.createElement("div");
        let label = document.createElement("label");
        let input = document.createElement("input");
        let span = document.createElement("span");
        label.textContent = parameter;
        var self = this;
        input.type = "range";
        input.value = this[parameter];
        input.min = min;
        input.max = max;
        input.step = step;
        input.addEventListener("input", () => {
            span.textContent = input.value;
            self[parameter] = parseFloat(input.value);
            self.update();
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

    setup() {
        // this.add_parameter_input("lpi", 1, 128);
        // this.add_parameter_input("dot_size", 1, 64);
        this.add_parameter_input("angle_degree", 0, 90, 1);
        this.add_parameter_input("grid_size", 8, 64, 1);
        this.add_parameter_input("noise_level", 0, 1, 0.01);
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
        //return Math.max(0, Math.min(1, x / this.width));
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
        /*
        if (image_aspect_ratio <= canvas_aspect_ratio) {
            i = Math.floor(y / this.height * this.image_height);
            j = Math.floor(x / this.height * this.image_height);
        } else {
            i = Math.floor(y / this.width * this.image_width);
            j = Math.floor(x / this.width * this.image_width);
        }
        */
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

    update() {
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.fillStyle = "black";
        let interlaced = true;
        let show_grid = false;
        let angle = this.angle_degree / 180 * Math.PI;
        let x_center = this.width / 2;
        let y_center = this.height / 2;
        
        let grid_width = this.width / this.grid_size;
        let grid_height = this.height / this.grid_size;

        let texture_pack = create_pixelated_dots_texture_pack(10);

        for (let i = -Math.floor(grid_height / 4); i < 1.25 * grid_height; i++) {
        //for (let i = Math.floor(grid_height / 2); i <= Math.floor(grid_height / 2); i++) {
            for (let j = -Math.floor(grid_width / 4); j < 1.25 * grid_width; j++) {
                let y_base = i * this.grid_size + .5 * this.grid_size;
                let x_base = j * this.grid_size + .5 * this.grid_size;
                if (interlaced) {
                    x_base += i % 2 * .5 * this.grid_size;
                }
                let x = Math.cos(angle) * (x_base - x_center) + Math.sin(angle) * (y_base - y_center) + x_center;
                let y = -Math.sin(angle) * (x_base - x_center) + Math.cos(angle) * (y_base - y_center) + y_center;
            
                // Draw surrounding square
                if (show_grid) {
                    this.context.strokeStyle = "black";
                    this.context.beginPath();
                    let sr = this.grid_size * .5;
                    let square_coordinates = [
                        [x + sr, y + sr],
                        [x + sr, y - sr],
                        [x - sr, y - sr],
                        [x - sr, y + sr],
                    ];
                    let rotated_square_coordinates = [];
                    for (let k = 0; k < 4; k++) {
                        let sx = square_coordinates[k][0];
                        let sy = square_coordinates[k][1];
                        rotated_square_coordinates.push([
                            (sx - x) * Math.cos(angle) + (sy - y) * Math.sin(angle) + x,
                            -(sx - x) * Math.sin(angle) + (sy - y) * Math.cos(angle) + y
                        ]);
                    }
                    this.context.moveTo(rotated_square_coordinates[0][0], rotated_square_coordinates[0][1]);
                    for (let i = 1; i <= rotated_square_coordinates.length; i++) {
                        this.context.lineTo(rotated_square_coordinates[i % rotated_square_coordinates.length][0], rotated_square_coordinates[i % rotated_square_coordinates.length][1]);
                    }
                    this.context.stroke();
                }
                
                let intensity = this.intensity_at(x, y);
                let radius = intensity * this.grid_size / 2;

                this.context.fillStyle = "black";


                // Draw an ellipse
                // this.context.beginPath();
                // this.context.ellipse(x, y, radius, radius*0.5, -Math.PI / 4, 0, 2 * Math.PI);
                // this.context.fill();
                
                // Draw a regular shape
                // let n = 3;
                // let angle_offset = 3 * Math.PI / 2; // Math.PI / n;
                // if (i % 2 == 0) angle_offset -= Math.PI;
                // this.context.beginPath();
                // this.context.moveTo(x + radius * Math.cos(angle_offset), y + radius* Math.sin(angle_offset));
                // for (let k = 0; k <= n; k++) {
                //     this.context.lineTo(x + radius * Math.cos(2 * k * Math.PI / n + angle_offset), y + radius * Math.sin(2 * k * Math.PI / n + angle_offset));
                // }
                // this.context.fill();

                //Draw a pixelated pixel
                let texture_index = Math.round(intensity * (texture_pack.length - 1));
                let texture = texture_pack[texture_index];
                texture.draw(this.context, x, y, this.grid_size, angle);

                // Draw a circle
                // this.context.beginPath();
                // this.context.arc(x, y, radius, 0, 2 * Math.PI);
                // this.context.fill();

            }
        }

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


}

window.addEventListener("load", () => {
    let controller = new Controller("canvas", 512, 512);
    controller.setup();
    controller.update();

});