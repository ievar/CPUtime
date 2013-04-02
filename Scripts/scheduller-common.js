var Process = function (name, length, startTime, priority, remainderContainer, runContainer) {
	/// <summary>
	/// Procesa klase
	/// </summary>
	/// <param name="name"> Procesa nosaukums </param>
	/// <param name="length"> Procesa izpildes laiks </param>
	/// <param name="startTime"> Procesa iera�an�s laiks </param>
	/// <param name="priority"> Procesa priorit�te </param>
	/// <param name="remainderContainer"> DOM elements, kur att�lot paliku�� laika stabi�u </param>
	/// <param name="runContainer"> DOM elements, kur likt kl�t izpild�t� laika stabi�u </param>
	this.Name = name;
	this.Length = length;
	this.RemaindingTime = length;
	this.StartTime = startTime;
	this.Priority = priority;
	this.RemainderContainer = remainderContainer;
	this.RunContainer = runContainer;
	var _remainder = {};
	var _runs = [];


	this.Initialize = function () {
		/// <summary>
		/// Izveido paliku�� laika stabi�u
		/// </summary>
		_remainder = $("<div class='bar " + this.Name + "' />").appendTo(this.RemainderContainer).get(0);
		$(_remainder).width(getRemainderWidth(this.Length));
	}

	var getRemainderWidth = function (time) {
		/// <summary>
		/// P�rv�r� izpildes laiku atliku�� laika stabi�a garum�
		/// </summary>
		/// <param name="time"> Izpildes laiks </param>
		/// <returns type="int"> Stabi�a garums pikse�os </returns>
		if (this.Name == "idle") {
			return 0;
		}
		return time;
	}

	var getRunWidth = function (time) {
		/// <summary>
		/// P�rv�r� izpildes laiku izpild�t� laika stabi�a garum�
		/// </summary>
		/// <param name="time"> Izpildes laiks </param>
		/// <returns type="int"> Stabi�a garums pikse�os </returns>
		if (this.Name == "idle") {
			return 0;
		}
		return time;
	}

	this.Run = function (time) {
		/// <summary>
		/// Darbina procesu, pievienojot jaunu izpildes stabi�u un samazinot atliku�� laika stabi�u
		/// </summary>
		/// <param name="time"> Izpildes laiks </param>
		/// <returns type="bool or 'idle'">
		/// "done" - process beidza darbu,
		/// true - process darboj�s, bet nebeidza darbu,
		/// false - process nevar�ja izpild�ties
		/// </returns>
		this.RemaindingTime -= time;
		if (this.RemaindingTime < 0) {
			time += this.RemaindingTime;
			this.RemaindingTime = 0;
		}
		if (time <= 0) {
			return false;
		}

		$(_remainder).width(getRemainderWidth(this.RemaindingTime));

		var run = $("<div class='run " + this.Name + "' />").appendTo(this.RunContainer).get(0);
		$(run).width(getRunWidth(time));
		_runs.push({ element: run, time: time });

		if (this.RemaindingTime == 0) {
			return "done";
		}
		return true;
	}

	this.Continue = function (time) {
		/// <summary>
		/// Darbina procesu, pagarinot iepriek��jo izpildes stabi�u un samazinot izpildes laika stabi�u
		/// </summary>
		/// <param name="time"> Izpildes laiks </param>
		/// <returns type="bool or 'idle'">
		/// "done" - process beidza darbu,
		/// true - process darboj�s, bet nebeidza darbu,
		/// false - process nevar�ja izpild�ties
		/// </returns>
		this.RemaindingTime -= time;
		if (this.RemaindingTime < 0) {
			time += this.RemaindingTime;
			this.RemaindingTime = 0;
		}
		if (time <= 0) {
			return false;
		}

		$(_remainder).width(getRemainderWidth(this.RemaindingTime));

		var run = _runs[_runs.length - 1];
		run.time += time;
		$(run.element).width(getRunWidth(run.time));

		if (this.RemaindingTime == 0) {
			return "done";
		}
		return true;
	}
}

var SchedullerCommon = function () {
	/// <summary>
	/// B�zes klase CPU laika pl�not�jam
	/// </summary>

	/// <var> Visu procesu saraksts </var>
	this._processList = [];
	/// <var> Pieejamo nepabeigto procesu saraksts </var>
	this._availableProcessList = [];
	/// <var> V�l nepieejamo procesu saraksts </var>
	this._incomingProcessList = [];
	/// <var> Pabeigto procesu saraksts </var>
	this._finishedProcessList = [];
	var _remainderContainer;
	var _runContainer;
	var _timer = {};
	/// <var> Pag�ju�ais laiks </var>
	this._ticksPassed = 0;
	var _tickDuration = -1;
	var _idleProcess;
	var _lastProcessName = "";

	this.Initialize = function (processList) {
		/// <summary>
		/// Ielasa procesu sarakstu, sagatavo procesu sarakstus un reseto laiku
		/// </summary>
		/// <param name="processList">
		/// Teksts - procesu saraksts.
		/// Rindi�as form�ts - [iera�an�s laiks] [nosaukums] [izpildes laiks] [priorit�te]
		/// </param>
		_remainderContainer = $("#processList").get(0);
		_runContainer = $("#progressBar").get(0);

		// clean up
		$(_remainderContainer).empty();
		$(_runContainer).empty();
		this._ticksPassed = 0;
		this._processList = [];
		this._incomingProcessList = [];
		this._availableProcessList = [];

		this._processList = this.ParseProcessList(processList);
		this._processList.sort(function (a, b) { return a.StartTime - b.StartTime; });
		for (var i = 0; i < this._processList.length; i++) {
			this._incomingProcessList.push(this._processList[i]);
		}
		_idleProcess = new Process("idle", Infinity, 0, -1, _remainderContainer, _runContainer);
		_idleProcess.Initialize();
	};

	this.ParseProcessList = function (input) {
		/// <summary>
		/// P�rs� tekstu par procesu sarakstu
		/// </summary>
		/// <param name="input">
		/// Teksts - procesu saraksts.
		/// Rindi�as form�ts - [iera�an�s laiks] [nosaukums] [izpildes laiks] [priorit�te]
		/// </param>
		/// <returns type=""> Procesu saraksts </returns>
		var parsed = [];

		var lines = input.split("\n");
		for (var i = 0; i < lines.length; i++) {
			var words = lines[i].split(" ");
			var process = new Process(words[1], words[2], words[0], words[3], _remainderContainer, _runContainer);
			process.Initialize();
			parsed.push(process);
		}

		return parsed;
	}

	this.Start = function (tickDuration) {
		/// <summary>
		/// S�k vai turpina darbin�t procesoru
		/// </summary>
		/// <param name="tickDuration"> Cik milisekundes att�lot vienu procesora ciklu (optional) </param>
		if (tickDuration) {
			_tickDuration = tickDuration;
		}
		var r = this;
		_timer = setInterval(function () { tick.call(r);  }, tickDuration);
	}

	this.Pause = function () {
		/// <summary>
		/// Pauz� procesora darbu
		/// </summary>
		clearInterval(_timer);
	}

	this.Stop = function () {
		/// <summary>
		/// P�rtrauc procesora darbu
		/// </summary>
		clearInterval(_timer);
		this._ticksPassed = 0;
	}

	var tick = function () {
		/// <summary>
		/// Darb�bas viena CPU 'cikla' laik�
		/// </summary>

		// pievieno visus br�vos procesus
		for (var i = 0; i < this._incomingProcessList.length; i++) {
			var process = this._incomingProcessList[i];
			if (process.StartTime == this._ticksPassed) {
				this._incomingProcessList.splice(i, 1);
				i--; // n�kamajiem elementiem samazin�s indekss
				this._availableProcessList.push(process);
			}
		}

		var result = this.RunCpu();

		// p�rvieto visus pabeigu�os procesus
		for (var i = 0; i < this._availableProcessList.length; i++) {
			var process = this._availableProcessList[i];
			if (process.RemaindingTime == 0) {
				this._availableProcessList.splice(i, 1);
				i--; // n�kamajiem elementiem samazin�s indekss
				this._finishedProcessList.push(process);
			}
		}
		//if ((!result || result == "done") && _incomingProcessList.length == 0) {
		if (this._availableProcessList.length == 0 && this._incomingProcessList.length == 0) { // ��di vienk�r��k
			this.Stop();
			return;
		}
		this._ticksPassed++;
	}

	this.RunCpu = function () {
		/// <summary>
		/// Pl�not�ja darb�bas viena cikla laik�
		/// </summary>
		/// <returns type="bool or 'done'">
		/// 'done' - visi procesi beigu�i darbu,
		/// true - p�d�jais process sekm�gi izpild�j�s, bet darbu nebeidza,
		/// false - n�c�s darbin�t idle procesu
		/// </returns>

		// pl�not�ja kods n�ks �eit mantotaj�s klas�s
	}

	this.RunProcess = function (index, time) {
		/// <summary>
		/// Atvieglo procesa darbin��anu. Autom�tiski turpina vai ar� s�k no jauna
		/// </summary>
		/// <param name="index"> Procesa indekss iek� _availableProcessList </param>
		/// <param name="time"> Izpildes laiks </param>
		/// <returns type="bool or 'idle'">
		/// "done" - process beidza darbu,
		/// true - process darboj�s, bet nebeidza darbu,
		/// false - process nevar�ja izpild�ties
		/// </returns>
		var process = this._availableProcessList[index];
		if (_lastProcessName == process.Name) {
			return process.Continue(time);
		}
		_lastProcessName = process.Name;
		return process.Run(time);
	}

	this.RunIdle = function (time) {
		/// <summary>
		/// Atvieglo idle procesa darbin��anu. Autom�tiski turpina vai ar� s�k no jauna
		/// </summary>
		/// <param name="time"> Izpildes laiks </param>
		/// <returns type="bool"> Vienm�r true </returns>
		if (_lastProcessName == "idle") {
			return _idleProcess.Continue(time);
		}
		_lastProcessName = "idle";
		return _idleProcess.Run(time);
	}
}
