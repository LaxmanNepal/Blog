/**
 * Represents the image class.
 */
var VImage = /** @class */ (function () {
    function VImage(imageData) {
        this.width = imageData.width;
        this.height = imageData.height;
        this.imageData = imageData;
    }
    VImage.prototype.clone = function () {
        var imageDataCopy = new ImageData(new Uint8ClampedArray(this.imageData.data), this.width, this.height);
        return new VImage(imageDataCopy);
    };
    /**
     * Returns the intesity at give coordinates
     *
     * @param {Number} x X Coordinate
     * @param {Number} y Y Coordinate
     * @param {Number} c Color channel, 0, 1, 2 are R, G, B respectively
     */
    VImage.prototype.at = function (x, y, c) {
        var index = (y * this.width + x) * 4 + c;
        return this.imageData.data[index];
    };
    /**
     * Updates the image at given coordinates.
     *
     * @param {Number} x X Coordinate
     * @param {Number} y Y Coordinate
     * @param {Number} c Color channel, 0, 1, 2 are R, G, B respectively
     * @param {Number} val Intensity value at given coordinates
     */
    VImage.prototype.update = function (x, y, c, val) {
        this.imageData.data[(y * this.width + x) * 4 + c] = val;
    };
    /**
     * Renders the image instance to the given {@param context}.
     *
     * @param {CanvasRenderingContext2D} context a Valid canvas context.
     */
    VImage.prototype.renderToContext = function (context) {
        // TODO(mebjas): rendere with full dimensions of the canvas.
        context.putImageData(this.imageData, 0, 0);
    };
    /**
     * Runs the given operator for each pixel
     *
     * @param {Function} operator
     */
    VImage.prototype.forEach = function (operator) {
        for (var y = 0; y < this.height; ++y) {
            for (var x = 0; x < this.width; ++x) {
                for (var c = 0; c < 3; ++c) {
                    var updatedValue = operator(x, y, c, this.at(x, y, c));
                    this.update(x, y, c, updatedValue);
                }
            }
        }
    };
    return VImage;
}());
var Histograms = /** @class */ (function () {
    function Histograms(image, binSize) {
        if (binSize === void 0) { binSize = 32; }
        this.image = image;
        this.binSize = binSize;
        this.compute();
    }
    Histograms.prototype.renderToContext = function (context, contextWidth, contextHeight) {
        context.clearRect(0, 0, contextWidth, contextHeight);
        var maxVal = this.findMaxVal();
        this.renderSingleHist(context, contextWidth, contextHeight, this.rHist, "#FF0000", maxVal);
        this.renderSingleHist(context, contextWidth, contextHeight, this.gHist, "#00FF00", maxVal);
        this.renderSingleHist(context, contextWidth, contextHeight, this.bHist, "#0000FF", maxVal);
        this.renderSingleHist(context, contextWidth, contextHeight, this.lumaHist, "#000000", maxVal);
    };
    Histograms.prototype.getColorHistogram = function (channel) {
        switch (channel) {
            case 0: return this.rHist;
            case 1: return this.gHist;
            case 2: return this.bHist;
        }
        throw "Invalid channel, max value = 2";
    };
    Histograms.prototype.getLumaHistogram = function () {
        return this.lumaHist;
    };
    Histograms.prototype.renderSingleHist = function (context, contextWidth, contextHeight, hist, strokeStyle, maxVal) {
        var epsilon = 0.01;
        context.beginPath();
        context.strokeStyle = strokeStyle;
        context.moveTo(0, contextHeight);
        // TODO(mebjas): Major assumption here that the canvas width is
        // same as the bin size which can fail at any point.
        for (var i = 0; i < this.binSize; i++) {
            var x = i * (contextWidth / this.binSize) + (contextWidth / this.binSize - 1);
            var y = contextHeight * (1 - (hist[i] / (maxVal + epsilon)));
            context.lineTo(x, y);
            context.stroke();
        }
    };
    Histograms.prototype.compute = function () {
        var _this = this;
        this.binIndexDivisor = 256 / this.binSize;
        var getBinIndex = function (intensity) {
            return Math.floor(intensity / _this.binIndexDivisor);
        };
        this.rHist = this.createEmptyHist();
        this.gHist = this.createEmptyHist();
        this.bHist = this.createEmptyHist();
        this.lumaHist = this.createEmptyHist();
        for (var y = 0; y < this.image.height; ++y) {
            for (var x = 0; x < this.image.width; ++x) {
                var rValue = this.image.at(x, y, 0);
                var gValue = this.image.at(x, y, 1);
                var bValue = this.image.at(x, y, 2);
                var lumaValue = 0.2126 * rValue + 0.7152 * gValue + 0.0722 * bValue;
                var rBin = getBinIndex(rValue);
                var gBin = getBinIndex(gValue);
                var bBin = getBinIndex(bValue);
                var lumaBin = getBinIndex(lumaValue);
                this.rHist[rBin]++;
                this.gHist[gBin]++;
                this.bHist[bBin]++;
                this.lumaHist[lumaBin]++;
            }
        }
        this.rHist = this.normalize(this.rHist);
        this.gHist = this.normalize(this.gHist);
        this.bHist = this.normalize(this.bHist);
        this.lumaHist = this.normalize(this.lumaHist);
    };
    Histograms.prototype.findMaxVal = function () {
        var findMaxValSingleHist = function (hist, maxValSoFar) {
            var maxVal = maxValSoFar;
            for (var i = 0; i < hist.length; ++i) {
                if (hist[i] > maxVal) {
                    maxVal = hist[i];
                }
            }
            return maxVal;
        };
        var maxValSoFar = 0;
        maxValSoFar = findMaxValSingleHist(this.rHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.gHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.bHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.lumaHist, maxValSoFar);
        return maxValSoFar;
    };
    Histograms.prototype.normalize = function (hist) {
        var netPixels = this.image.width * this.image.height;
        for (var i = 0; i < this.binSize; i++) {
            hist[i] = hist[i] / netPixels;
        }
        return hist;
    };
    Histograms.prototype.createEmptyHist = function () {
        var hist = [];
        for (var i = 0; i < this.binSize; i++) {
            hist.push(0);
        }
        return hist;
    };
    return Histograms;
}());
var CDFs = /** @class */ (function () {
    function CDFs(histograms) {
        this.histograms = histograms;
        this.compute();
    }
    CDFs.prototype.renderToContext = function (context, contextWidth, contextHeight) {
        context.clearRect(0, 0, contextWidth, contextHeight);
        var maxVal = 1.0;
        this.renderSingleCdf(context, contextWidth, contextHeight, this.rCdf, "#FF0000", maxVal);
        this.renderSingleCdf(context, contextWidth, contextHeight, this.gCdf, "#00FF00", maxVal);
        this.renderSingleCdf(context, contextWidth, contextHeight, this.bCdf, "#0000FF", maxVal);
        this.renderSingleCdf(context, contextWidth, contextHeight, this.lumaCdf, "#000000", maxVal);
    };
    CDFs.prototype.renderSingleCdf = function (context, contextWidth, contextHeight, hist, strokeStyle, maxVal) {
        var epsilon = 0.01;
        context.beginPath();
        context.strokeStyle = strokeStyle;
        context.moveTo(0, contextHeight);
        // TODO(mebjas): Major assumption here that the canvas width is
        // same as the bin size which can fail at any point.
        var binSize = this.histograms.binSize;
        for (var i = 0; i < binSize; i++) {
            var x = i * (contextWidth / binSize) + (contextWidth / binSize - 1);
            var y = contextHeight * (1 - (hist[i] / (maxVal + epsilon)));
            context.lineTo(x, y);
            context.stroke();
        }
    };
    CDFs.prototype.compute = function () {
        var rHist = this.histograms.getColorHistogram(0);
        var gHist = this.histograms.getColorHistogram(1);
        var bHist = this.histograms.getColorHistogram(2);
        var lumaHist = this.histograms.getLumaHistogram();
        this.rCdf = this.createEmptyCdf();
        this.gCdf = this.createEmptyCdf();
        this.bCdf = this.createEmptyCdf();
        this.lumaCdf = this.createEmptyCdf();
        this.rCdf[0] = rHist[0];
        this.gCdf[0] = gHist[0];
        this.bCdf[0] = bHist[0];
        this.lumaCdf[0] = lumaHist[0];
        var length = rHist.length;
        for (var i = 1; i < length; ++i) {
            this.rCdf[i] = this.rCdf[i - 1] + rHist[i];
            this.gCdf[i] = this.gCdf[i - 1] + gHist[i];
            this.bCdf[i] = this.bCdf[i - 1] + bHist[i];
            this.lumaCdf[i] = this.lumaCdf[i - 1] + lumaHist[i];
        }
    };
    CDFs.prototype.createEmptyCdf = function () {
        var hist = [];
        for (var i = 0; i < this.histograms.binSize; i++) {
            hist.push(0);
        }
        return hist;
    };
    return CDFs;
}());
//# sourceMappingURL=library.js.map