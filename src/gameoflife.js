/*! 
 * GameOfLife.js Copyright (C) 2014 Lukas Henkel
 * 
 * Copying and distribution of this file, with or without modification,
 * are permitted in any medium without royalty provided the copyright
 * notice and this notice are preserved.  This file is offered as-is,
 * without any warranty.
 */

var GameOfLife = (function() {
    var Canvas = (function() {
        function Canvas(elem) {
            this.ctx = elem.getContext('2d');
        }

        Canvas.prototype.rect = function(x, y, width, height, radius) {
            radius = radius || 0;
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + width - radius, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.ctx.lineTo(x + width, y + height - radius);
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.ctx.lineTo(x + radius, y + height);
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
            return this;
        };

        Canvas.prototype.fill = function(color) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
            return this;
        };

        return Canvas;
    })();

    var ifNotTypeThen = function(val, type, then) {
        if(typeof val !== type)
            return then;
        return val;
    };

    var Cell = (function() {
        function Cell(canvas, x, y, style) {
            this.canvas = canvas;
            this.posX = x;
            this.posY = y;
            this.style = style;
            this.enabled = false;
            this.enabledCached = false;
        }

        Cell.prototype.draw = function(force) {
            var redraw = this.enabled !== this.enabledCached;
            this.enabled = this.enabledCached;
            if(redraw || force) {
                this.canvas.rect(this.posX, this.posY, this.style.width, this.style.height)
                           .fill(this.style.bgColor);
                this.canvas.rect(this.posX, this.posY, this.style.width, this.style.height, this.style.borderRadius)
                           .fill(this.enabled ? this.style.colorEnabled : this.style.colorDisabled);
            }
            return this;
        };

        Cell.prototype.toggle = function() {
            this.enabledCached = !this.enabled;
            return this;
        };

        Cell.prototype.live = function() {
            this.enabledCached = true;
            return this;
        };

        Cell.prototype.die = function() {
            this.enabledCached = false;
            return this;
        };

        Cell.prototype.getNeighbors = function() {
            var neighbors = [];
            for(var y = this.y - 1, yl = this.y + 2; y < yl; y++) {
                for(var x = this.x - 1, xl = this.x + 2; x < xl; x++) {
                    if(x !== this.x || y != this.y)
                        neighbors.push(this.cells.get(x, y));
                }
            }
            return neighbors;
        };

        return Cell;
    })();

    var CellCollection = (function() {
        function CellCollection(cols, rows) {
            this.elements = [];
            this.cols = cols;
            this.rows = rows;
        }

        CellCollection.prototype.push = function(cell) {
            cell.x = this.elements.length % this.rows;
            cell.y = parseInt(this.elements.length / this.rows, 10);
            cell.cells = this;
            this.elements.push(cell);
        };

        CellCollection.prototype.draw = function(force) {
            for(var i = 0, l = this.elements.length; i < l; i++)
                this.elements[i].draw(force);
            return this;
        };

        CellCollection.prototype.get = function(x, y) {
            if(x < 0) x = this.cols + x;
            if(y < 0) y = this.rows + y;
            x = x % this.cols;
            y = y % this.rows;
            return this.elements[y * this.cols + x];
        };

        return CellCollection;
    })();

    var defaultOptions = function(options) {
        options.width = ifNotTypeThen(options.width, 'number', 10);
        options.height = ifNotTypeThen(options.height, 'number', 10);
        options.border = ifNotTypeThen(options.border, 'number', 1);
        options.bgColor = ifNotTypeThen(options.bgColor, 'string', '#000');
        options.borderRadius = ifNotTypeThen(options.borderRadius, 'number', 0);
        options.cellStyle = options.cellStyle || {};
        options.cellStyle.width  = ifNotTypeThen(options.cellStyle.cellWidth, 'number', 50);
        options.cellStyle.height = ifNotTypeThen(options.cellStyle.cellHeight, 'number', 50);
        options.cellStyle.borderRadius = ifNotTypeThen(options.cellStyle.borderRadius, 'number', options.borderRadius);
        options.cellStyle.colorDisabled = ifNotTypeThen(options.cellStyle.colorDisabled, 'string', '#FFF');
        options.cellStyle.colorEnabled = ifNotTypeThen(options.cellStyle.colorEnabled, 'string', '#000');

        options.cellStyle.bgColor = options.bgColor;
        options.cellStyle.border = options.border;
    };

    function GameOfLife(options) {
        options = options || {};
        defaultOptions(options);

        this.options = options;
        this.element = document.createElement('canvas');
        this.width  = this.element.width  = options.border + (options.cellStyle.width  + options.border) * options.width;
        this.height = this.element.height = options.border + (options.cellStyle.height + options.border) * options.height;
        this.canvas = new Canvas(this.element);
        this.isRunning = false;
        this.intervalId = -1;
        
        this.cells = new CellCollection(options.width, options.height);
        for(var y = 0; y < options.height; y++) {
            for(var x = 0; x < options.width; x++) {
                var posX = options.border + (options.cellStyle.width  + options.border) * x,
                    posY = options.border + (options.cellStyle.height + options.border) * y;
                this.cells.push(new Cell(this.canvas, posX, posY, options.cellStyle));
            }
        }

        var self = this;
        this.element.addEventListener('click', function(e) {
            var rect = self.element.getBoundingClientRect(),
                posX = e.clientX - rect.left - self.options.border,
                posY = e.clientY - rect.top - self.options.border;

            var cellWidthBorder  = self.options.cellStyle.width  + self.options.border,
                cellHeightBorder = self.options.cellStyle.height + self.options.border;
            
            var x = parseInt(posX / cellWidthBorder, 10),
                y = parseInt(posY / cellHeightBorder, 10);

            if(posX % cellWidthBorder <= self.options.cellStyle.width &&
               posY % cellHeightBorder <= self.options.cellStyle.height) {
                self.cells.get(x, y).toggle().draw();
            }
        }, false);

        this.draw();
    }

    GameOfLife.prototype.draw = function() {
        this.canvas.rect(0, 0, this.width, this.height, this.options.borderRadius)
                   .fill(this.options.bgColor);
        this.cells.draw(true);
        return this;
    };

    GameOfLife.prototype.step = function() {
        var cells = this.cells.elements;
        for(var i = 0, il = cells.length; i < il; i++) {
            var cell = cells[i],
                neighbors = cell.getNeighbors();

            var neighborsAlive = 0;
            for(var j = 0, jl = neighbors.length; j < jl; j++) {
                if(!neighbors[j]) console.log(neighbors.length, j, cell.x, cell.y);
                if(neighbors[j].enabled)
                    neighborsAlive++;
            }

            if(cell.enabled && neighborsAlive < 2 || neighborsAlive > 3) {
                cell.die();
            } else if(neighborsAlive === 3) {
                cell.live();
            }
        }
        this.cells.draw();
        return this;
    };

    GameOfLife.prototype.start = function(interval) {
        var self = this;
        var last = new Date();
        (function loop() {
            self.intervalId = requestAnimationFrame(function() {
                var now = new Date();
                if(now - last >= interval) {
                    last = now;
                    self.step();
                }
                loop();
            });
        })();
        this.isRunning = true;
        return this;
    };

    GameOfLife.prototype.stop = function() {
        cancelAnimationFrame(this.intervalId);
        this.isRunning = false;
        return this;
    };

    return GameOfLife;
})();

